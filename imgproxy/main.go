// imgproxy fetches result images for the frontend, so Save and Copy can read them from this origin.
// It only fetches public http(s) addresses, so it can't be used to reach the home network.
package main

import (
	"context"
	"errors"
	"io"
	"log"
	"mime"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"os"
	"strconv"
	"syscall"
	"time"
)

const maxBytes = 40 << 20

// SVG is left out because it can carry scripts, and this origin would run them.
var allowedTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/gif":  true,
	"image/webp": true,
	"image/avif": true,
	"image/bmp":  true,
}

var errBlocked = errors.New("address is not public")

// 100.64.0.0/10 (carrier-grade NAT, also used by Tailscale) isn't covered by netip's checks.
var sharedSpace = netip.MustParsePrefix("100.64.0.0/10")

func public(addr netip.Addr) bool {
	addr = addr.Unmap()
	return addr.IsGlobalUnicast() && !addr.IsPrivate() && !sharedSpace.Contains(addr)
}

// The check runs on the address actually being dialled, after DNS, so rebinding and redirects can't get around it.
func checkDial(_, address string, _ syscall.RawConn) error {
	ap, err := netip.ParseAddrPort(address)
	if err != nil || !public(ap.Addr()) {
		return errBlocked
	}
	return nil
}

var client = &http.Client{
	Timeout: 30 * time.Second,
	Transport: &http.Transport{
		// No Proxy: environment proxy settings would bypass the address check.
		DialContext: (&net.Dialer{
			Timeout: 10 * time.Second,
			Control: checkDial,
		}).DialContext,
		TLSHandshakeTimeout:   10 * time.Second,
		ResponseHeaderTimeout: 15 * time.Second,
		MaxIdleConns:          20,
		IdleConnTimeout:       60 * time.Second,
	},
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 5 {
			return errors.New("too many redirects")
		}
		if !allowedScheme(req.URL) {
			return errBlocked
		}
		return nil
	},
}

func allowedScheme(u *url.URL) bool {
	return (u.Scheme == "https" || u.Scheme == "http") && u.Host != "" && u.User == nil
}

func handle(w http.ResponseWriter, r *http.Request) {
	h := w.Header()
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("Content-Security-Policy", "default-src 'none'; sandbox")

	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	raw := r.URL.Query().Get("url")
	target, err := url.Parse(raw)
	if len(raw) > 4096 || err != nil || !allowedScheme(target) {
		http.Error(w, "bad url", http.StatusBadRequest)
		return
	}

	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, target.String(), nil)
	if err != nil {
		http.Error(w, "bad url", http.StatusBadRequest)
		return
	}
	// An honest name: hosts like Wikimedia refuse a browser name sent with Go's TLS fingerprint.
	req.Header.Set("User-Agent", "searxng-frontend-imgproxy/1.0")
	req.Header.Set("Accept", "image/avif,image/webp,image/png,image/*;q=0.8")

	resp, err := client.Do(req)
	if err != nil {
		if errors.Is(err, errBlocked) {
			http.Error(w, "address not allowed", http.StatusForbidden)
		} else if errors.Is(err, context.Canceled) {
			return
		} else {
			http.Error(w, "fetch failed", http.StatusBadGateway)
		}
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, "upstream status "+strconv.Itoa(resp.StatusCode), http.StatusBadGateway)
		return
	}
	mediaType, _, _ := mime.ParseMediaType(resp.Header.Get("Content-Type"))
	if !allowedTypes[mediaType] {
		http.Error(w, "not an image", http.StatusUnsupportedMediaType)
		return
	}
	if resp.ContentLength > maxBytes {
		http.Error(w, "too large", http.StatusRequestEntityTooLarge)
		return
	}

	h.Set("Content-Type", mediaType)
	h.Set("Cache-Control", "private, max-age=3600")
	if resp.ContentLength >= 0 {
		h.Set("Content-Length", strconv.FormatInt(resp.ContentLength, 10))
	}
	// A body without a length that runs past the limit is cut off, which the browser sees as a failed load.
	io.Copy(w, io.LimitReader(resp.Body, maxBytes))
}

func main() {
	addr := os.Getenv("IMGPROXY_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8085"
	}
	server := &http.Server{
		Addr:              addr,
		Handler:           http.HandlerFunc(handle),
		ReadHeaderTimeout: 10 * time.Second,
	}
	log.Printf("imgproxy listening on %s", addr)
	log.Fatal(server.ListenAndServe())
}
