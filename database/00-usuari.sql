-- =====================================================================
-- HOW MUCH?! LIVE · Base de dades i usuari per a Node.js
-- Equivalent als passos 4.3 de la guia T0, amb la base de dades del projecte.
--
-- A XAMPP, root només accepta connexions des de dins del contenidor.
-- Node.js s'hi connecta des de fora, així que cal un usuari amb host '%'.
-- Només per a desenvolupament: el port només és accessible des del teu
-- ordinador (127.0.0.1).
-- =====================================================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS howmuch_live
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'nodeuser'@'%' IDENTIFIED BY 'nodepass';

-- Permisos només sobre la base de dades del projecte (la guia fa servir *.*;
-- si algun cop vols que nodeuser pugui crear altres bases de dades, canvia
-- howmuch_live.* per *.*)
GRANT ALL PRIVILEGES ON howmuch_live.* TO 'nodeuser'@'%';