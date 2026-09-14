# DEFT3R Akıllı Toplantı Defteri

DEFT3R maskotlu toplantı notu arayüzü. Maskot görselleri ve videoları `public/media` içinde projeye dahildir; yerel çalıştırmada ayrıca bir medya servisine ihtiyaç duyulmaz.

## Yerelde çalıştırma

Gereksinimler: Bun 1.2+ veya güncel Node.js.

```bash
bun install
bun run dev
```

Ardından tarayıcıda `http://localhost:3000` adresini açın. Terminal farklı bir adres gösterirse terminaldeki bağlantıyı kullanın.

Node.js/npm ile:

```bash
npm install
npm run dev
```

## Üretim paketi

```bash
bun run build
```

## Medya dosyaları

Yeni logo renkli sürümler `public/media/` klasöründedir. Eski renkli özgün sürümler aynı dosya adlarıyla `public/media/original/` klasöründedir:

- `deft3r-notebook-mascot.png`
- `deft3r-video-waiting-frame.png`
- `deft3r-open-and-continuous-writing.mp4`
- `deft3r-open-and-continuous-writing-transparent.webm`
