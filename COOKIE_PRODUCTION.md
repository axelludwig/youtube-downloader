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

Une page d'administration peut permettre de téléverser un fichier `cookies.txt`. Cette fonctionnalité doit être strictement protégée :

- endpoint réservé à un administrateur authentifié ;
- upload `multipart/form-data` avec limite de taille et validation du format Netscape ;
- stockage hors du répertoire public, avec permissions `600` ;
- remplacement atomique de l'ancien fichier ;
- aucune lecture, prévisualisation ou exposition du contenu au navigateur ;
- audit de l'action sans enregistrer le cookie lui-même ;
- conservation du fichier en dehors de Git et des sauvegardes non chiffrées.

Pour une instance publique, privilégier la configuration serveur ou un gestionnaire de secrets. L'upload frontend est adapté à une interface d'administration privée.
