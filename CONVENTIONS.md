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
│   └── styles.css                # Styles (dark/light theme)
├── src/
│   ├── config/
│   │   ├── dirs.js               # Dossiers de sortie (downloads/, merged/)
│   │   └── paths.js              # Chemins des binaires (yt-dlp, ffmpeg)
│   ├── core/
│   │   ├── exec-progress.js      # Wrapper execFile avec parsing progression yt-dlp
│   │   ├── ffmpeg-init.js        # Configure fluent-ffmpeg avec les binaires locaux
│   │   └── progress-sse.js       # Broadcast SSE vers le frontend
│   ├── downloaders/
│   │   ├── youtube.js            # Téléchargement YouTube (vidéo + audio)
│   │   ├── tiktok.js             # Téléchargement TikTok (vidéo + audio)
│   │   ├── instagram.js          # Téléchargement Instagram (vidéo + audio + cookies)
│   │   └── yt-dlp.js             # Downloader générique via yt-dlp
│   ├── routes/
│   │   ├── download.route.js     # Routes POST /download/* et /download/batch
│   │   ├── file.route.js         # Route GET /file?path=... (livraison fichier)
│   │   └── progress.route.js     # Route GET /progress (SSE)
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
