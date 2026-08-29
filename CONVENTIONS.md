# Conventions du projet youtube-downloader

## Structure du projet

```
youtube-downloader/
├── app.js                        # Point d'entrée Express
├── libs/
│   ├── ffmpeg/                   # Binaires ffmpeg/ffprobe (locaux)
│   └── yt-dlp/                   # Binaire yt-dlp (local)
├── cookies/
│   └── instagram.txt             # Cookies Instagram (export navigateur)
├── public/
│   ├── index.html                # Interface web
│   ├── app.js                    # Logique frontend
│   ├── admin.html                # Page d'administration (upload cookies)
│   ├── admin.js                  # Logique frontend admin
│   └── styles.css                # Styles (dark/light theme)
├── scripts/
│   └── hash-password.js          # CLI pour générer ADMIN_PASSWORD_HASH
├── src/
│   ├── config/
│   │   ├── dirs.js               # Dossiers de sortie (downloads/, merged/)
│   │   ├── paths.js              # Chemins des binaires (yt-dlp, ffmpeg) et cookies
│   │   └── auth.js               # Config admin (ADMIN_PASSWORD_HASH, SESSION_SECRET)
│   ├── core/
│   │   ├── exec-progress.js      # Wrapper execFile avec parsing progression yt-dlp
│   │   ├── ffmpeg-init.js        # Configure fluent-ffmpeg avec les binaires locaux
│   │   ├── progress-sse.js       # Broadcast SSE vers le frontend
│   │   ├── cookie-file.js        # Parsing/validation des fichiers cookies.txt (Netscape)
│   │   ├── password.js           # Hash/vérification mot de passe admin (scrypt)
│   │   ├── admin-sessions.js     # Sessions admin en mémoire
│   │   └── login-rate-limit.js   # Limitation des tentatives de login admin
│   ├── downloaders/
│   │   ├── youtube.js            # Téléchargement YouTube (vidéo + audio)
│   │   ├── tiktok.js             # Téléchargement TikTok (vidéo + audio)
│   │   ├── instagram.js          # Téléchargement Instagram (vidéo + audio + cookies)
│   │   └── yt-dlp.js             # Downloader générique via yt-dlp
│   ├── middleware/
│   │   └── require-admin.js      # Middleware d'authentification admin
│   ├── routes/
│   │   ├── download.route.js     # Routes POST /download/* et /download/batch
│   │   ├── file.route.js         # Route GET /file?path=... (livraison fichier)
│   │   ├── progress.route.js     # Route GET /progress (SSE)
│   │   ├── cookie-status.route.js   # Route GET /api/cookies/status
│   │   ├── admin-auth.route.js      # Routes POST /api/admin/login|logout, GET /api/admin/session
│   │   └── cookie-upload.route.js   # Route POST /api/admin/cookies/:site (protégée)
│   └── services/
│       └── download.service.js   # Service générique (détection site + dispatch)
└── ecosystem.config.cjs          # Config PM2
```

## Architecture

- **Téléchargement vidéo** : yt-dlp télécharge flux vidéo et audio séparément → `fluent-ffmpeg` fusionne
- **Téléchargement audio** : yt-dlp avec `-x --audio-format mp3 --ffmpeg-location <FFMPEG_DIR>` (ffmpeg local requis pour la conversion)
- **Progression** : yt-dlp émet des pourcentages dans stderr/stdout, `exec-progress.js` les parse et les broadcast via SSE
- **Binaires** : ffmpeg et yt-dlp sont embarqués dans `libs/` — ne pas utiliser les versions système

## Convention de nommage des commits

Format général : `<type>(<scope>): <description>` ou `<type> <description>`

| Préfixe | Usage |
|---------|-------|
| `feat(scope):` | Nouvelle fonctionnalité |
| `fix(scope):` | Correction de bug |
| `add` | Ajout d'un fichier, d'une dépendance ou d'un support |
| `fix` | Correction courte sans scope |

**Règles :**
- Tout en minuscules
- Pas de point final
- Description en anglais, impérative et concise
- Le scope est optionnel mais utile quand plusieurs modules sont touchés

**Exemples tirés de l'historique :**
```
feat(ui,download): improve frontend and harden download route handling
fix(audio): pass --ffmpeg-location to yt-dlp for audio extraction
fix progress bar and status not reaching 100% on download completion
add tiktok compatibility, sound / video download
add instagram compatibility
```
