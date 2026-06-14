<p align="center">
  <img src="icons/plugin-icon-source.png" width="128" height="128" alt="Morph" />
</p>

<h3 align="center">Morph</h3>

<p align="center">
  Edit any HTML page like a slide deck.<br />
  Chrome extension · in-page editing · AI assistant
</p>

<p align="center">
  <a href="https://morph-longdz6299-7110s-projects.vercel.app"><img src="https://img.shields.io/badge/website-live-EC4E02?style=flat-square" alt="Website" /></a>
  <img src="https://img.shields.io/badge/v1.1.1-555?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-555?style=flat-square" alt="License" />
</p>

## Install

```bash
git clone https://github.com/jimuzhe/morph.git
cd morph
npm install
npm run build
```

1. Open `chrome://extensions` and enable **Developer mode**
2. **Load unpacked** → select `dist/`
3. Enable **Allow access to file URLs** in extension details
4. Open any HTML file or webpage, click the Morph icon

## Development

```bash
npm run dev          # extension watch build
npm run package      # build + zip

cd site && npm run dev   # marketing site
```

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Y` | Redo |
| `Cmd/Ctrl + S` | Save |
| `Esc` | Exit edit mode |

## License

MIT
