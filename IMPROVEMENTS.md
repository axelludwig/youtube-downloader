# Gestion des Erreurs yt-dlp - Documentation des Améliorations

## Problèmes Résolus

### 1. **Vidéos Age-Restricted YouTube**
**Avant :** Le bot crashait avec `ERROR: Sign in to confirm your age`

**Après :** 
- Détection de l'erreur dans `exec-progress.js`
- Retour d'une réponse HTTP 403 avec message clair : "Cette vidéo est réservée aux utilisateurs connectés"
- Code d'erreur: `AGE_RESTRICTED`

### 2. **Gestion des Erreurs yt-dlp**
**Améliorations :**
- Détection automatique des codes d'erreur :
  - `AGE_RESTRICTED` → HTTP 403
  - `CONTENT_RESTRICTED` → HTTP 403
  - `SESSION_INVALID` → HTTP 401
  - `VIDEO_UNAVAILABLE` → HTTP 404
  - `YTDLP_ERROR` → HTTP 500 avec message utilisateur

### 3. **Sanitisation des Noms de Fichiers**
- Le caractère `|` est déjà correctement converti en espace
- Exemple : `Sayo-nara (With Vocals) | Doki Doki Literature Club.mp3` 
  → `Sayo-nara (With Vocals)   Doki Doki Literature Club.mp3`

## Installation des Cookies

### Pour YouTube (Vidéos Age-Restricted)

1. **Exporter les cookies YouTube :**
   - Installer l'extension navigateur "Get cookies.txt" (Chrome/Firefox)
   - Visiter youtube.com et exporter les cookies
   - Placer le fichier dans le répertoire `cookies/youtube.txt`

2. **Configurer .env :**
   ```bash
   YOUTUBE_COOKIES_PATH=./cookies/youtube.txt
   ```

3. **Redémarrer l'application**

### Pour Instagram

1. **Exporter les cookies Instagram :**
   - Même procédure que YouTube
   - Placer le fichier dans `cookies/instagram.txt`

2. **Configurer .env :**
   ```bash
   INSTAGRAM_COOKIES_PATH=./cookies/instagram.txt
   ```

## Routes Améliorées

Toutes les routes de téléchargement (`/download/*`) retournent maintenant des erreurs structurées :

```json
{
  "error": "Titre de l'erreur",
  "details": "Message détaillé pour l'utilisateur",
  "code": "CODE_ERREUR"
}
```

### Codes d'Erreur Disponibles

| Code | HTTP | Signification |
|------|------|---|
| `AGE_RESTRICTED` | 403 | Vidéo réservée aux utilisateurs connectés |
| `CONTENT_RESTRICTED` | 403 | Contenu restreint ou non disponible |
| `SESSION_INVALID` | 401 | Cookies expirés/invalides |
| `VIDEO_UNAVAILABLE` | 404 | Vidéo supprimée/privée |
| `YTDLP_ERROR` | 500 | Erreur générique yt-dlp |

## Fichiers Modifiés

- ✅ `src/core/exec-progress.js` - Détection des codes d'erreur
- ✅ `src/config/paths.js` - Ajout support YOUTUBE_COOKIES_PATH
- ✅ `src/core/media-names.js` - Cookies YouTube dans getVideoMetadata
- ✅ `src/downloaders/youtube.js` - Cookies YouTube dans les args
- ✅ `src/routes/download.route.js` - Gestion d'erreur améliorée
- ✅ `.env.example` - Documentation des variables d'environnement

## Prochaines Améliorations Recommandées

1. **Mise à jour yt-dlp** : Vérifier la version et mettre à jour si nécessaire
2. **Runtime JS pour yt-dlp** : Si besoin de JavaScript dans les scripts yt-dlp
3. **Cleanup des fichiers temporaires** : Nettoyer les fichiers video/audio après fusion
4. **Validation des fichiers** : Vérifier l'intégrité des fichiers téléchargés
5. **Logs détaillés** : Ajouter plus de logs pour faciliter le débogage
