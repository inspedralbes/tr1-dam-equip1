#!/bin/sh
set -e

SSL_DIR="/etc/nginx/ssl"
mkdir -p "$SSL_DIR"

# Si hi ha certificat de Let's Encrypt muntat, el fem servir
LE_CERT=""
for domain in tr1grup1.dam.inspedralbes.cat grup1howmuch.dam.inspedralbes.cat; do
  if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$domain/privkey.pem" ]; then
    LE_CERT="/etc/letsencrypt/live/$domain"
    break
  fi
done

if [ -n "$LE_CERT" ]; then
  ln -sf "$LE_CERT/fullchain.pem" "$SSL_DIR/fullchain.pem"
  ln -sf "$LE_CERT/privkey.pem" "$SSL_DIR/privkey.pem"
  echo "[nginx] Certificat Let's Encrypt carregat des de $LE_CERT"
elif [ ! -f "$SSL_DIR/fullchain.pem" ] || [ ! -f "$SSL_DIR/privkey.pem" ]; then
  echo "[nginx] Generant certificat SSL autosignat per a HTTPS/WSS..."
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "$SSL_DIR/privkey.pem" \
    -out "$SSL_DIR/fullchain.pem" \
    -subj "/CN=howmuch-live" \
    -addext "subjectAltName=DNS:localhost,DNS:tr1grup1.dam.inspedralbes.cat,DNS:grup1howmuch.dam.inspedralbes.cat,IP:127.0.0.1,IP:2.31.112.198"
fi

exec "$@"
