# Guide de gestion des cookies en production

Ce projet peut fournir un fichier de cookies à `yt-dlp` afin d'accéder aux contenus YouTube ou Instagram nécessitant une session connectée. Ces fichiers sont sensibles : ils peuvent donner accès à la session du compte qui les a créés.

## Configuration recommandée

### 1. Exporter les cookies

Depuis un navigateur connecté au compte autorisé :

1. Exporter les cookies au format Netscape (`cookies.txt`) avec une extension d'export de cookies.
2. Nommer le fichier `youtube.txt` ou `instagram.txt`.
3. Ne jamais envoyer ce fichier dans Git, par messagerie non chiffrée ou dans les logs.

Il est préférable d'utiliser un compte dédié au service plutôt qu'un compte Google personnel.

### 2. Installer le fichier sur le serveur

Exemple pour une application installée dans `/opt/youtube-downloader` et exécutée par l'utilisateur `appuser` :

```bash
sudo mkdir -p /opt/youtube-downloader/cookies
sudo cp youtube.txt /opt/youtube-downloader/cookies/youtube.txt
sudo chown appuser:appuser /opt/youtube-downloader/cookies/youtube.txt
sudo chmod 600 /opt/youtube-downloader/cookies/youtube.txt
```

Pour Instagram, utiliser le même principe avec `instagram.txt`.

### 3. Configurer les variables d'environnement

Dans le fichier `.env` de production, hors de Git :

```env
NODE_ENV=production
YOUTUBE_COOKIES_PATH=/opt/youtube-downloader/cookies/youtube.txt
INSTAGRAM_COOKIES_PATH=/opt/youtube-downloader/cookies/instagram.txt
```

L'application lit ces variables au démarrage et transmet les fichiers à `yt-dlp`.

### 4. Redémarrer l'application

Avec PM2 :

```bash
pm2 restart youtube-downloader --update-env
```

Avec systemd :

```bash
sudo systemctl restart youtube-downloader
```

Consulter ensuite les logs du service. Le chemin du fichier peut apparaître dans les logs, mais son contenu ne doit jamais y apparaître.

## Déploiement Docker

Monter le fichier comme un volume en lecture seule :

```yaml
services:
  youtube-downloader:
    volumes:
      - /opt/secrets/youtube.txt:/run/secrets/youtube.txt:ro
    environment:
      YOUTUBE_COOKIES_PATH: /run/secrets/youtube.txt
```

## Renouvellement et dépannage

Les cookies expirent ou peuvent être invalidés. Réexporter puis remplacer le fichier lorsque l'API renvoie notamment :

- `SESSION_INVALID` ;
- `AGE_RESTRICTED` ;
- une erreur yt-dlp indiquant qu'une connexion est requise.

Après remplacement du fichier, redémarrer le service si la configuration a changé.

## Upload depuis le frontend

Une page d'administration (`/admin.html`) permet de téléverser un fichier `cookies.txt` pour YouTube et Instagram, protégée par mot de passe.

### Activer la page d'administration

Tant que les deux variables suivantes ne sont pas définies, `/admin.html` répond "administration désactivée" et les endpoints `/api/admin/*` renvoient `503` :

```bash
# 1. Générer le hash du mot de passe
node scripts/hash-password.js "mon-mot-de-passe"

# 2. Générer un secret aléatoire pour signer les cookies de session
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Dans `.env` :

```env
ADMIN_PASSWORD_HASH=<sortie de l'étape 1>
SESSION_SECRET=<sortie de l'étape 2>
```

Redémarrer l'application après modification.

### Ce que fait l'implémentation

- endpoint réservé à un administrateur authentifié (`POST /api/admin/login`, session en cookie `httpOnly` signé, valable 12h) ;
- limitation naïve des tentatives de connexion (5 essais / 15 min par IP) ;
- upload `multipart/form-data` (`POST /api/admin/cookies/youtube` ou `/instagram`), limité à 512 Ko ;
- validation du format Netscape et présence d'au moins un cookie de session reconnu pour le site visé ;
- écriture atomique (fichier temporaire puis renommage) avec permissions restreintes (`600`, sans effet sur Windows) ;
- aucune lecture, prévisualisation ou renvoi du contenu au navigateur — seul un statut (valide/expiré/manquant) est exposé via `/api/cookies/status` ;
- audit en log serveur (date + site), jamais le contenu du cookie.

### Limites à connaître

- les sessions admin sont en mémoire : elles sont perdues si le process redémarre (PM2 restart, crash) — il faut se reconnecter ;
- il n'y a qu'un seul mot de passe partagé, pas de comptes distincts ;
- si l'application tourne derrière un reverse proxy, penser à `app.set("trust proxy", 1)` pour que la limitation par IP et `secure` sur le cookie fonctionnent correctement.

Pour une instance exposée publiquement, restreindre en plus l'accès à `/admin.html` au niveau du reverse proxy (IP allowlist, VPN) plutôt que de compter uniquement sur le mot de passe applicatif.
