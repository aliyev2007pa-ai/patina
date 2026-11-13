# PATINA — Proje Ana Dosyası (Claude Code Spesifikasyonu)

> **Bu dosya nedir?**
> Bu dosya hem senin (Aliyev) yol haritan hem de Claude Code'un tek kaynağıdır.
> Claude Code her oturumda **önce bu dosyayı okur**, hangi fazda olduğunu buradan anlar,
> o fazı yapar, sonra bu dosyadaki ilerleme kutularını işaretler.
>
> **Claude Code'a ilk mesajın şu olacak:**
> `PROJECT.md dosyasını oku. Kurallar bölümüne uy. FAZ 0'dan başla.`

---

## 0. PROJE KİMLİĞİ

| Alan | Değer |
|---|---|
| **Proje adı** | **Patina** (öneri — değiştirebilirsin) |
| **Alt başlık** | *Turn your photos into old master oil paintings* |
| **Ne yapar?** | Kullanıcı bir fotoğraf yükler, site onu 19. yy klasik yağlı boya tablo görünümüne çevirir, kullanıcı indirir ve isterse galerisine kaydeder. |
| **Arayüz dili** | **İngilizce** (tüm buton/metin İngilizce) |
| **Kod/yorum dili** | Kod İngilizce, Claude Code'un açıklamaları Türkçe |
| **Amaç** | Ticari değil. Öğrenme + portföy. Para kazanılmayacak. |
| **Maliyet hedefi** | **0 ₺ / ay — kalıcı olarak.** Hiçbir fazda ücretli servis eklenmeyecek. |

*"Patina" = eski tabloların üzerindeki zamanla oluşan sararmış vernik tabakası. Projenin tam olarak yaptığı şey.*

---

## 1. KESİNLEŞMİŞ KARARLAR (Değiştirilemez — Aliyev onayladı)

Bu kararlar sorulup onaylandı. Claude Code bunları **tartışmaya açmayacak**, sormayacak, değiştirmeyecek.

### 1.1 Çevirme motoru: Tarayıcıda çalışan ücretsiz filtre motoru
- **AI API KULLANILMAYACAK.** Ne Gemini, ne Nano Banana, ne Replicate, ne OpenAI, ne Hugging Face, ne Stable Diffusion.
- **Sebep:** Gemini'nin görsel modelleri (Nano Banana dahil) ücretsiz katmanda yok — her görsel para istiyor. Proje kalıcı ücretsiz olmak zorunda.
- Çevirme işlemi **%100 kullanıcının tarayıcısında**, WebGL2 shader ile yapılır.
- **Bunun iki büyük avantajı var ve bunlar sitenin reklamı olacak:**
  1. **Sınırsız ve bedava** — sunucu maliyeti sıfır, kota yok, kuyruk yok, bekleme yok.
  2. **Tam gizlilik** — fotoğraf kullanıcının cihazından **hiç çıkmaz**. Sunucuya gitmez. (Sadece kullanıcı "Save to gallery" derse yüklenir.) Bu, ana sayfada açıkça yazılacak: *"Your photo never leaves your device."*

### 1.2 Supabase: Giriş (Auth) + Kişisel galeri (Storage + Database)
- Supabase Auth ile e-posta/şifre girişi.
- Giriş yapan kullanıcı tablolarını kaydedebilir, kendi galerisinde görebilir, silebilir.
- **Giriş zorunlu DEĞİL.** Giriş yapmayan da siteyi tam kullanır ve indirir — sadece kaydedemez. (Bu önemli: site Supabase çökse bile çalışmaya devam eder.)

### 1.3 Teknoloji
- **Next.js (App Router) + TypeScript + Tailwind CSS**
- Deploy: **Vercel** (Hobby/ücretsiz plan)
- Versiyon kontrol: **Git + GitHub**
- Backend: **Supabase** (Free plan)

### 1.4 Renk paleti — Turkuaz / Beyaz / Koyu altın sarısı / Siyah
Bu 4 renk dışına çıkılmayacak (gri tonları ve şeffaflıklar serbest).

```css
/* globals.css içine token olarak girilecek */
--ink:        #0B0B0C;  /* Ana siyah — sayfa zemini (müze duvarı) */
--surface:    #16161A;  /* Kart/panel zemini */
--surface-2:  #1F1F25;  /* Yükseltilmiş panel, input zemini */
--turquoise:  #1FB3A6;  /* Ana vurgu — butonlar, linkler, aktif durum */
--turquoise-d:#0E8C83;  /* Turkuaz hover/basılı hali */
--gold:       #C9A227;  /* Koyu altın — çerçeve, başlık vurgusu, ikincil buton */
--gold-d:     #8C6A1A;  /* Altın gölge/kenar */
--paper:      #F7F3EA;  /* Sıcak kırık beyaz — tuval/kağıt yüzeyler */
--white:      #FFFFFF;  /* Saf beyaz — sadece ana metin ve ikonlar */
--muted:      #9A968E;  /* İkincil metin */
```

**Renk kullanım kuralı:**
- Zemin siyah, metin beyaz/kırık beyaz.
- **Turkuaz = eylem** (Upload, Download, Save, linkler).
- **Altın = değer/çerçeve** (tablo çerçeveleri, başlık altı çizgisi, "Pro görünüm" detaylar). Altın asla ana buton rengi olmayacak, aksi halde ucuz görünür.
- Saf beyaz geniş alanlarda zemin olarak kullanılmayacak (göz yorar + müze hissini bozar).

### 1.5 Tasarım yönü: "Dijital müze"
- Siyah galeri duvarı hissi, tablolar ince **altın çerçeve** içinde.
- Tablo altında müzelerdeki gibi küçük **künye (plaque)**: eser adı, stil, tarih.
- Yazı tipleri (ikisi de Google Fonts, ücretsiz):
  - **Cormorant Garamond** → başlıklar, logo, künye (klasik serif, müze hissi)
  - **Inter** → tüm arayüz metni, butonlar (okunaklı)
- Bol boşluk, sakin animasyonlar (200–300ms), gereksiz gölge/parlaklık yok.

---

## 2. ÜCRETSİZLİK GARANTİSİ (Bu tabloya uyulacak)

| Servis | Plan | Limit | Bizim kullanımımız | Risk |
|---|---|---|---|---|
| Vercel | Hobby | 100 GB bant genişliği/ay, ticari olmayan kullanım | Statik site + küçük JS | Çok düşük |
| Supabase | Free | 500 MB veritabanı | Sadece metin satırları (~1 KB/kayıt) | Yok |
| Supabase | Free | **1 GB depolama** | Tablo görselleri — **kota kuralı şart, bkz. 2.1** | ⚠️ Dikkat |
| Supabase | Free | 5 GB egress/ay | Galeri görüntüleme | Orta — thumbnail şart |
| Supabase | Free | 50.000 aylık aktif kullanıcı | Çok yeterli | Yok |
| GitHub | Free | Sınırsız public repo | Kod | Yok |
| Google Fonts | Free | — | 2 font | Yok |

### 2.1 Kota koruma kuralları (ZORUNLU — FAZ 5'te uygulanacak)
1 GB depolamayı korumak için:
- Kaydedilen görsel **uzun kenarı en fazla 1600 px** ve **JPEG kalite 0.82** olacak → ortalama ~350 KB.
- Her kayıt için ayrıca **400 px thumbnail** üretilip ayrı dosya olarak yüklenecek (~40 KB). Galeri listesi **sadece thumbnail** gösterecek — egress'i 10 kat düşürür.
- **Kullanıcı başına en fazla 20 kayıtlı tablo.** 21.'de "Delete one to save a new one" uyarısı.
- Yükleme öncesi dosya boyutu kontrolü: 2 MB üstü reddedilecek.
- Bu kurallar hem istemci tarafında hem veritabanı seviyesinde (CHECK / policy) uygulanacak.

> **Matematik:** 1 GB ÷ (350 KB + 40 KB) ≈ 2.700 tablo ≈ 135 kullanıcı × 20 tablo. Öğrenme projesi için fazlasıyla yeterli.

### 2.2 Supabase "uyku" uyarısı
Ücretsiz Supabase projeleri **1 hafta hiç istek almazsa duraklatılır (paused)** ve panelden elle açılması gerekir. Siteye haftada bir girmen yeterli. İstersen FAZ 8'de GitHub Actions ile haftalık otomatik "ping" eklenir (o da ücretsiz).

---

## 3. YAĞLI BOYA MOTORU — TEKNİK SPESİFİKASYON

Bu projenin kalbi. Claude Code bunu **FAZ 3**'te yazacak.

### 3.1 Mimari
- `WebGL2` fragment shader zinciri (hızlı, 1-2 saniyede sonuç).
- Shader'lar ayrı `.glsl` dosyalarında veya template string olarak `lib/engine/shaders/` altında.
- **Fallback:** WebGL2 yoksa Web Worker içinde CPU (Canvas2D + ImageData) versiyonu çalışacak — yavaş ama çalışır. Kullanıcıya "Running in compatibility mode" notu gösterilir.
- Ana thread asla kilitlenmeyecek.

### 3.2 İşlem hattı (pipeline) — sırayla
```
1. LOAD & NORMALIZE
   - Görseli oku, uzun kenarı max 2048 px olacak şekilde küçült
   - EXIF orientation düzelt (telefon fotoları yan dönmesin)
   - Lineer renk uzayına geç (sRGB -> linear) — tüm işlemler burada yapılır

2. DENOISE (hafif)
   - 3x3 median veya küçük bilateral blur
   - Amaç: JPEG gürültüsü fırça darbesine karışmasın

3. KUWAHARA — FIRÇA DARBESİ (ana adım)
   - Anizotropik (yönlü) genelleştirilmiş Kuwahara filtresi
   - 8 sektör, radius görsele göre 3–10 px (kullanıcı "Brush size" ile ayarlar)
   - Yapı tensöründen yön hesaplanır -> fırça darbeleri konturu takip eder
   - BU ADIM "boyanmış" hissini veren şeydir, kalitesi her şeyi belirler

4. IMPASTO — BOYA KALINLIĞI (sahte 3B)
   - Kuwahara çıktısının parlaklığından yükseklik haritası (height map) üret
   - Normal map hesapla, sol-üstten gelen ışıkla aydınlat
   - Soft-light/overlay olarak %15–25 opaklıkta bindir
   - Sonuç: boya yüzeyde kabarmış gibi görünür

5. OLD MASTER RENK TONLAMA
   - Doygunluk x0.85
   - Sıcak kayma: parlak alanlar sarıya/kreme, gölgeler umber-kahveye
   - Siyahları kaldır (saf siyah olmasın — eski vernik etkisi), beyazları hafif kır
   - S-eğrisi kontrast (chiaroscuro) — merkez aydınlık, kenarlar koyu
   - Her kanal için ayrı eğri (tone curve)

6. KANVAS DOKUSU
   - Prosedürel dokuma deseni (shader içinde üretilir, dosya indirmek gerekmez)
   - Overlay/multiply, %8–14 opaklık
   - Dokunun ölçeği görsel boyutuna göre sabit kalmalı (zoom'da bozulmamalı)

7. CRAQUELURE — ÇATLAKLAR (opsiyonel, varsayılan kapalı)
   - Worley/Voronoi noise tabanlı ince çatlak ağı
   - Çok düşük opaklık (%5–10), sadece "Aged" preset'inde açık

8. VARNISH & VIGNETTE
   - Radyal koyu vinyet (kenarlar), merkeze sıcak altın parlaklık
   - Çok hafif — abartılırsa amatör görünür

9. EXPORT
   - Lineer -> sRGB geri dönüş
   - PNG (kayıpsız) veya JPEG 0.92 indirme seçeneği
   - İsteğe bağlı altın çerçeve + künye basılı halde export
```

### 3.3 Hazır stiller (Presets)
Her biri yukarıdaki parametrelerin kayıtlı bir kombinasyonu. Kullanıcı tek tıkla uygular, sonra elle ince ayar yapabilir.

| Preset | Karakter | Not |
|---|---|---|
| **Ottoman Court** | Sıcak, altın-kahve, güçlü chiaroscuro, orta fırça | Senin bahsettiğin Fatih portresi hissi — **varsayılan preset bu olacak** |
| **Rembrandt** | Çok koyu gölge, tek yönlü sıcak ışık, derin kontrast | Dramatik portre |
| **Renaissance** | Daha açık, yumuşak geçişler, soluk renk, ince fırça | Sakin, resmî |
| **Baroque** | Yoğun doygunluk, kalın impasto, güçlü vinyet | Gösterişli |
| **Aged Canvas** | Renaissance + çatlak + güçlü doku + sararmış vernik | En "eski" görünüm |

### 3.4 Kullanıcı kontrolleri (sliderlar)
`Intensity` · `Brush size` · `Warmth` · `Contrast` · `Canvas texture` · `Vignette` · `Cracks (on/off)` · `Gold frame (on/off)`

Her slider değişiminde **debounce 150ms** ile yeniden render. Önizleme düşük çözünürlükte (max 1024px) anlık, "Render full quality" butonuna basınca tam çözünürlük.

### 3.5 Olmazsa olmazlar
- **Before/After karşılaştırma:** ortadan sürüklenen ayırıcı (slider) ile.
- Render sırasında ilerleme göstergesi.
- "Reset to preset" butonu.
- Sonuç kötü çıkarsa kullanıcı suçlanmayacak: yüz içeren fotoğraflar için "Tip: portraits with soft, even lighting work best" ipucu.

---

## 4. SAYFA YAPISI

| Rota | İçerik | Giriş gerekli? |
|---|---|---|
| `/` | Landing: başlık, örnek önce/sonra, "Start painting" butonu, gizlilik vurgusu | Hayır |
| `/studio` | **Ana uygulama.** Yükleme, presetler, sliderlar, önizleme, indir, kaydet | Hayır |
| `/gallery` | Kullanıcının kayıtlı tabloları (grid, altın çerçeve + künye), sil | **Evet** |
| `/login` | Giriş / Kayıt (tek sayfa, sekmeli) | Hayır |
| `/about` | Nasıl çalışır, gizlilik, kullanılan teknolojiler, ücretsiz olduğu | Hayır |

Header: logo (Patina) · Studio · Gallery · (Sign in / avatar+Sign out)
Footer: GitHub linki · "Made with Next.js, Supabase & Vercel" · "100% free, no ads, no tracking"

---

## 5. VERİTABANI ŞEMASI (Supabase)

```sql
-- Tablo: kaydedilen eserler
create table public.paintings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null default 'Untitled' check (char_length(title) <= 80),
  preset       text not null check (preset in
                 ('ottoman','rembrandt','renaissance','baroque','aged')),
  image_path   text not null,          -- storage: {user_id}/{id}.jpg
  thumb_path   text not null,          -- storage: {user_id}/{id}_thumb.jpg
  width        int,
  height       int,
  bytes        int check (bytes <= 2097152),  -- 2 MB üst sınır
  created_at   timestamptz not null default now()
);

create index paintings_user_created_idx
  on public.paintings (user_id, created_at desc);

-- RLS: her kullanıcı SADECE kendi kayıtlarını görür/yazar/siler
alter table public.paintings enable row level security;

create policy "own_select" on public.paintings
  for select using (auth.uid() = user_id);

create policy "own_insert" on public.paintings
  for insert with check (auth.uid() = user_id);

create policy "own_delete" on public.paintings
  for delete using (auth.uid() = user_id);

-- Kullanıcı başına 20 kayıt sınırı (veritabanı seviyesinde zorlanır)
create or replace function public.enforce_painting_quota()
returns trigger language plpgsql security definer as $$
begin
  if (select count(*) from public.paintings where user_id = new.user_id) >= 20 then
    raise exception 'QUOTA_EXCEEDED';
  end if;
  return new;
end $$;

create trigger paintings_quota
  before insert on public.paintings
  for each row execute function public.enforce_painting_quota();
```

### 5.1 Storage
- Bucket adı: `paintings` — **private** (public değil!)
- Dosya yolu şeması: `{user_id}/{painting_id}.jpg` ve `{user_id}/{painting_id}_thumb.jpg`
- Görüntüleme **signed URL** ile (1 saat geçerli). Public URL kullanılmayacak.
- Storage policy'leri: kullanıcı sadece kendi klasörüne yazar/okur/siler:

```sql
create policy "own_folder_all" on storage.objects
  for all using (
    bucket_id = 'paintings'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'paintings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## 6. GÜVENLİK KURALLARI (Her fazda geçerli)

1. **Asla** `SUPABASE_SERVICE_ROLE_KEY` istemci tarafına konmayacak, repoya girmeyecek. Bu projede hiç gerek yok.
2. İstemcide sadece `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` kullanılır. (Anon key herkese açık olabilir — **ama ancak RLS açıksa güvenli.** RLS her tabloda açık olacak.)
3. `.env.local` **mutlaka** `.gitignore` içinde. Repoya hiç secret girmeyecek.
4. Yükleme doğrulaması: sadece `image/jpeg`, `image/png`, `image/webp`; max 10 MB giriş; dosya imzası (magic bytes) kontrolü.
5. **EXIF temizliği:** kaydedilen görselden konum/cihaz bilgisi silinecek (canvas'a yeniden çizim bunu zaten yapar — doğrulanacak).
6. `next.config.ts` içinde güvenlik başlıkları: `Content-Security-Policy`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`.
7. Hiç üçüncü parti analytics/tracking/reklam eklenmeyecek. ("no tracking" sözü tutulacak.)
8. Şifre kuralı: min 8 karakter. Supabase'in kendi e-posta doğrulaması açık olacak.
9. Hata mesajları kullanıcıya teknik detay sızdırmayacak (stack trace, SQL hatası vb.).

---

## 7. FAZLAR

**Kural:** Claude Code bir fazı bitirir, `npm run build` ile hata olmadığını doğrular, commit atar, **durur ve senin onayını bekler.** Onay gelmeden sonraki faza geçmez.

---

### ✅ FAZ 0 — Kurulum ve ilk canlı yayın
**Amaç:** Daha tek satır özellik yazmadan boş sitenin internette açılması. (Deploy'u en başta öğrenmek, en sona bırakmaktan çok daha kolay.)

- [x] Gerekli programlar: Node.js (LTS), Git, VS Code — kurulu mu kontrol et, değilse Aliyev'e indirme linkini ver
- [x] Hesaplar: GitHub, Supabase, Vercel — Aliyev açacak (Claude Code adım adım anlatacak)
- [x] `npx create-next-app@latest patina --typescript --tailwind --app --eslint`
- [x] `git init`, `.gitignore` kontrolü (`.env*`, `node_modules`, `.next`)
- [x] GitHub'da `patina` reposu (public), ilk commit + push
- [x] Vercel'e GitHub ile giriş → repoyu import → deploy
- [x] Ana sayfaya sadece "Patina — coming soon" yaz, canlı adreste gör

**Kabul kriteri:** `https://patina-xxx.vercel.app` adresi açılıyor ve "Patina" yazıyor. `git push` yapınca Vercel otomatik yeniden deploy ediyor.

**Aliyev burada ne öğrenecek:** Git commit/push, GitHub repo, Vercel otomatik deploy zinciri.

**Yapıldı (2026-11-06):**
- Node.js 26.13.0 LTS + npm 11.20.0 ve GitHub CLI 2.103.3 winget ile kuruldu. Git 2.55 ve VS Code 1.130 zaten kuruluydu.
- Next.js 16.4.5 (App Router) + TypeScript + Tailwind CSS 4 + ESLint kuruldu. Tailwind 4 artık `tailwind.config.ts` kullanmıyor, yapılandırma `globals.css` içinde `@theme` ile yapılıyor — FAZ 1'de renk tokenları oraya girecek.
- `npm run build` temiz geçti. Next.js anonim telemetrisi kapatıldı (bölüm 6, kural 7).
- Repo: https://github.com/aliyev2007pa-ai/patina — ilk commit `f1230ad` push edildi.
- PROJECT.md `patina/` içine taşındı, böylece repoda yedekli ve versiyonlu.
- **Canlı adres: https://patina-steel-nine.vercel.app** — Vercel takımı `Filinta`, plan Hobby (ücretsiz). İlk deploy 25 saniye sürdü.
- **Kabul kriteri doğrulandı (2026-11-09):** Ana sayfaya gizlilik satırı eklenip `d81ad25` push edildi; Vercel elle hiçbir şey yapılmadan yeniden yayınladı ve yeni satır canlı sitede göründü. push → otomatik deploy zinciri çalışıyor.

**Sapmalar / açık kalanlar:**
- Repo **public** (Aliyev çevirdi, 2026-11-06). İlk oluşturma private yapılmıştı; Claude Code'un izin sistemi public repo oluşturmaya izin vermiyor. Public'e geçince secret taraması yapıldı: repodaki 18 dosyanın hiçbirinde ve git geçmişinde anahtar/`.env` izi yok.
- Vercel GitHub bağlantısı Aliyev tarafından yapıldı (popup ve kimlik doğrulama adımları Claude Code'a kapalı). GitHub App `aliyev2007pa-ai` hesabına **yalnızca patina** reposu için kuruldu.
- **Yerelde build sorunu:** Windows Application Control politikası `@next/swc-win32-x64-msvc` native dosyasını engelliyor. Next.js WASM'a düşüyor ve Turbopack WASM ile çalışmadığı için `npm run build` hata veriyor. Vercel'in Linux sunucularında bu sorun yok.

  **Çözüldü (Aliyev kararı, 2026-11-09):** `package.json` içindeki `dev` ve `build` script'lerine `--webpack` eklendi. Konsolda görünen `⚠ Attempted to load @next/swc-win32-x64-msvc` uyarıları zararsız — Next.js WASM'a düşüyor ve derleme tamamlanıyor.

  **Bu değişikliğin bir yan etkisi oldu ve düzeltildi:** `create-next-app` projeye Tailwind eklentisi olarak `@tailwindcss/turbopack` koymuştu; bu eklenti yalnızca Turbopack'e bağlanıyor. Script'ler webpack'e alınınca Tailwind sessizce devre dışı kaldı — build hata vermedi ama üretilen CSS'te hiçbir utility sınıfı yoktu ve canlı site bir süre stilsiz yayınlandı. Önce commit geri alınıp site kurtarıldı, sonra `@tailwindcss/postcss` kurulup `postcss.config.mjs` eklendi. **Ders:** build'in "başarılı" demesi çıktının doğru olduğu anlamına gelmiyor; her deploy sonrası siteye gözle bakılacak.
- Vercel 2FA kurulumu ertelendi ("Remind Me in 1 Day"). İstenirse sonra kurulur.
- `npm audit`: 8 moderate uyarı, hepsi create-next-app'in standart bağımlılıklarından. FAZ 7'de ele alınacak.

---

### ✅ FAZ 1 — Tasarım sistemi ve iskelet
**Amaç:** Siteyi "güzel" yapan temeli kurmak. Henüz hiç işlevsellik yok, sadece görünüm.

- [x] `globals.css` içine 1.4'teki renk tokenları
- [x] Tailwind config'e renkleri ve fontları bağla
- [x] Cormorant Garamond + Inter'ı `next/font` ile yükle
- [x] `components/Header.tsx`, `Footer.tsx`, `GoldFrame.tsx`, `Plaque.tsx`, `Button.tsx`
- [x] `/` landing sayfası: başlık, alt başlık, "Start painting" butonu, gizlilik satırı, statik örnek görsel (şimdilik placeholder)
- [x] `/about` sayfası
- [x] Mobil uyum (320px'e kadar bozulmayacak)
- [x] Commit + push, canlıda kontrol

**Kabul kriteri:** Site müze gibi görünüyor, 4 renk paletine uyuyor, telefonda da düzgün.

**Yapıldı (2026-11-12):**
- Renk tokenları `globals.css` içinde CSS değişkeni olarak duruyor (PROJECT.md 1.4 ile birebir), `@theme inline` ile Tailwind'e bağlandı. Artık `bg-ink`, `text-gold`, `border-gold-d` gibi sınıflar var. Tailwind 4'te `tailwind.config.ts` yok, yapılandırma CSS'in içinde.
- Fontlar `next/font` ile yükleniyor: başlık/logo/künye için **Cormorant Garamond**, arayüz metni için **Inter**. Build sırasında indirilip kendi sunucumuzdan servis ediliyor — Google'a istek gitmiyor, bu da "no tracking" sözünü destekliyor.
- Bileşenler: `Header`, `Footer`, `Button`, `GoldFrame`, `Plaque`, `ComingSoon`, `SampleArtwork`.
- `GoldFrame` iç içe kenarlıklardan yapıldı, görsel dosya kullanmıyor — her zoom seviyesinde keskin kalıyor.
- `SampleArtwork` prosedürel bir SVG: solda fotoğraf, sağda tablo. Kanvas dokusu `feTurbulence` ile üretiliyor; gerçek motorun yapacağı şeyin küçük bir provası. FAZ 3'te gerçek bir önce/sonra çifti ile değiştirilecek.
- `/` ve `/about` sayfaları gerçek içerikle yazıldı.
- Mobil: 320px'de tarayıcıda ölçüldü, hiçbir rotada yatay taşma yok (`scrollWidth === innerWidth`). Başlıklar mobilde küçülüyor ve `text-balance` ile düzgün bölünüyor.
- Klavye odağı görünürlüğü ve `prefers-reduced-motion` desteği şimdiden eklendi (FAZ 6'nın işi ama ucuzdu).

**Kapsam dışına taşan tek şey:** Header'daki Studio/Gallery/Sign in linkleri henüz yapılmamış sayfalara gidiyordu. 404 vermemeleri için `/studio`, `/gallery`, `/login` adreslerine dürüst birer "yapım aşamasında" sayfası konuldu (`ComingSoon` bileşeni). FAZ 2 ve FAZ 4 bunları gerçek sayfalarla değiştirecek.

---

### ✅ FAZ 2 — Fotoğraf yükleme ve önizleme
**Amaç:** Dosyayı alıp ekranda gösterebilmek. Filtre yok.

- [x] `/studio` sayfası
- [x] Sürükle-bırak + dosya seçme alanı (`DropZone.tsx`)
- [x] Doğrulama: tip, boyut (max 10 MB), magic bytes
- [x] EXIF orientation düzeltmesi
- [x] Canvas'a çizim, uzun kenar max 2048px küçültme
- [x] Hata durumları: yanlış tip, çok büyük, bozuk dosya → düzgün İngilizce mesaj
- [x] "Remove / choose another" butonu
- [x] Commit + push

**Kabul kriteri:** Telefondan yan çekilmiş bir fotoğraf bile doğru yönde ekranda görünüyor.

**Yapıldı (2026-11-12):**
- `lib/image/validate.ts` — tip, boyut ve **magic bytes** kontrolü. Dosyanın adı değil ilk baytları okunuyor; `.txt` dosyasını `.jpg` diye yeniden adlandırmak işe yaramıyor (PROJECT.md 6.4).
- `lib/image/exif.ts` — JPEG'in APP1 bölümünü gezip 0x0112 numaralı yön etiketini okuyan küçük bir ayrıştırıcı. Okuyamadığı her durumda 1 (dik) dönüyor; yanlış yön bir kullanıcıyı rahatsız eder, çökme herkesi.
- `lib/image/decode.ts` — yönü düzeltip uzun kenarı 2048px'e indiriyor. Canvas'tan geçirmek EXIF'i tamamen siliyor, yani konum/cihaz bilgisi kaydedilen tabloya sızamıyor (PROJECT.md 6.5 kendiliğinden sağlanmış oluyor).
- `components/DropZone.tsx` — sürükle-bırak + dosya seçme. Görünür alan gizli bir `input`'u saran `<label>`, böylece klavye ve ekran okuyucu desteği bedava geliyor.
- `components/Studio.tsx` — önizleme, künye (dosya adı, boyut, çalışma boyutu, dönüş bilgisi) ve "Choose another".

**Bir hata bulundu ve düzeltildi:** İlk sürümde `createImageBitmap`'ten `imageOrientation: "none"` istenip dönüş elle uygulanıyordu. Tarayıcı bu isteği yok sayıp EXIF'i kendisi uyguladı, üstüne bir de bizimki eklenince fotoğraf 90° yerine **180°** döndü. Çözüm: kod artık çalışma anında, EXIF etiketi taşıyan 2×1'lik bir JPEG çözerek tarayıcıya "sen mi döndürüyorsun" diye soruyor ve cevabına göre davranıyor. Sayfa başına bir kez hesaplanıyor.

**Tarayıcıda doğrulandı:**
| Test | Sonuç |
|---|---|
| EXIF 6 (yan çekilmiş), 400×200 | 200×400, 90° saat yönü — **doğru** |
| 4000×3000 JPEG | 2048×1536'ya küçültüldü |
| 600×800 PNG | değişmeden geçti |
| `.txt` dosyası | "not a photo Patina can read" |
| boş dosya | "That file is empty." |
| 11 MB dosya | "limit is 10.0 MB" |
| `.jpg` adlı metin dosyası | "looks damaged" — magic bytes yakaladı |
| 320px genişlik | yatay taşma yok |

**Yan düzeltme:** `eslint.config.mjs` içindeki `globalIgnores` listesi ESLint'in varsayılanlarını eziyordu ve `node_modules` listede yoktu; `npm run lint` bütün bağımlılıkları tarayıp 139.882 sorun bildiriyordu. Liste düzeltildi, `lint` komutu da kendi kaynak klasörlerimizi hedefleyecek şekilde ayarlandı.

---

### ◻ FAZ 3 — YAĞLI BOYA MOTORU ⭐ (En önemli faz)
**Amaç:** Bölüm 3'teki pipeline'ı çalıştırmak. Bu faz bitince **site aslında bitmiş** sayılır — backend olmadan tam kullanılabilir.

- [x] `lib/engine/` klasör yapısı, WebGL2 context kurulumu
- [x] Shader: denoise
- [x] Shader: **anizotropik Kuwahara** (yapı tensörü + 8 sektör)
- [x] Shader: impasto (height → normal → lighting)
- [x] Shader: old master tone curve
- [x] Shader: kanvas dokusu (prosedürel)
- [x] Shader: craquelure (prosedürel noise)
- [x] Shader: vinyet + vernik
- [ ] 5 preset'in parametre tanımları (`lib/engine/presets.ts`)
- [ ] Kontrol paneli: sliderlar + preset seçici (debounce 150ms)
- [ ] Hızlı önizleme (1024px) / tam kalite render ayrımı
- [x] Before/After sürgülü karşılaştırma
- [ ] Altın çerçeve + künye bindirmesi (opsiyonel, export'a dahil)
- [ ] PNG / JPEG indirme
- [ ] Web Worker CPU fallback (WebGL2 yoksa)
- [ ] Commit + push

**Kabul kriteri:** Bir portre fotoğrafı yüklendiğinde "Ottoman Court" preset'i ile çıkan sonuç, filtre uygulanmış fotoğraf gibi değil **boyanmış tablo** gibi görünüyor. 2048px render masaüstünde 3 saniyenin altında bitiyor.

**3a yapıldı (2026-11-13) — fırça darbeleri:**
- `lib/engine/gl.ts` — WebGL2 bağlamı, shader derleme, render hedefleri. Geometri yok: vertex shader üç köşesini `gl_VertexID`'den türetiyor.
- `lib/engine/shaders/denoise.ts` — sRGB'den lineer renk uzayına geçiş + 5×5 bilateral. Lineer uzay şart: sRGB değerlerini ortalamak yanlış renk verir, sonraki her adım ortalama alıyor.
- `lib/engine/shaders/tensor.ts` — Sobel ile yapı tensörü, ardından ayrılabilir Gauss ile yumuşatma. Tensörü yumuşatmak açıyı yumuşatmaktan farklı ve doğru olan: 10° ile 170° açıların ortalaması 90° çıkar ki saçmadır, tensörlerin ortalaması yataydır ki doğrudur.
- `lib/engine/shaders/kuwahara.ts` — 8 sektörlü anizotropik Kuwahara. Sektörler seçilmiyor, varyanslarına göre ağırlıklandırılıyor; tek kazanan seçmek komşu piksellerde zıplamaya ve lekelenmeye yol açıyor.
- `components/BeforeAfter.tsx` — sürüklenebilir ayırıcı, klavyeyle de çalışıyor (PROJECT.md 3.5).
- `components/Slider.tsx` + Studio'da 4 kontrol, 150 ms debounce ile yeniden render.

**İki hata bulundu ve düzeltildi:**
1. **Elips yanlış yöne uzuyordu.** Özvektör `(λ1 - g, f)` formülü tam yatay bir kenarda (f = 0 ve λ1 = g) sıfır vektör veriyor ve yön kayboluyor. Yedek tahmin yarı yarıya yanlış olduğu için fırça kenar boyunca değil kenarın üstünden geçiyordu — yani boyamak yerine bulandırıyordu. Çift açı formülüne geçildi: `θ = 0.5·atan(2f, e−g)`, bu formülün böyle bir boşluğu yok.
2. **Süre ölçümü yanlıştı.** WebGL işi sadece kuyruğa alıyor; render çağrısının etrafını ölçmek her zaman "1 ms" veriyordu. Artık tek piksel geri okunarak GPU'nun bitirmesi bekleniyor, ölçüm gerçek.

**Varsayılanlar teoriyle değil çıktıya bakarak seçildi:** fırça 8 px, keskinlik 14, kontur 2, denoise 0.3. Keskinlik 12'nin altında benzer sakinlikteki sektörler birbirine karışıp görüntüyü yumuşatıyor; kontur 2'nin altında darbeler konturu takip edecek kadar uzamıyor.

**Ölçüm:** 1000×750 önizleme, fırça 8 → ~270 ms. 2048 tam çözünürlük henüz ölçülmedi; PROJECT.md'nin 3 saniye hedefi 3c'de tam kalite render eklenince doğrulanacak.

**3b yapıldı (2026-11-13) — boya, renk ve yüzey:**
- `shaders/impasto.ts` — fırça darbelerinin parlaklığı yükseklik haritası olarak kullanılıyor; oradan normal, oradan sol üstten gelen ışık. Sol üst keyfi değil: dönemin neredeyse bütün Avrupa resminde ışık oradan gelir, başka yön göze yanlış gelir. Sonuç soft-light ile bindiriliyor — toplama yapsaydık bütün resim açılırdı, soft-light sadece var olanı dikleştiriyor.
- `shaders/tone.ts` — dört iş birden: doygunluğu toprak boyalara çekmek (dönemin paletinde kadmiyum kırmızı veya ftalo mavi yoktu), açıkları kreme gölgeleri umbere ayırmak, siyahları kaldırmak (vernikli yüzey ışığı saçar; saf siyah bırakmak sahteliğin en belirgin işareti), ve S-eğrisi. Eğriler algısal uzayda uygulanıyor; lineer uzayda S-eğrisi gölgeleri çamura çeviriyor.
- `shaders/surface.ts` — üç shader bir dosyada: kanvas dokuması, craquelure ve vernik+vinyet. Hepsi shader içinde üretiliyor, hiçbir dosya indirilmiyor.
- Doku ve çatlakların ölçüsü piksel değil, görselin oranı cinsinden. Bir kanvasta iplik sayısı sabittir; 1024 önizleme ile 2048 render aynı dokuyu göstermeli, yoksa tam kalite render'a basınca resmin karakteri değişir.
- `components/Toggle.tsx` — çatlaklar için aç/kapa. Varsayılan kapalı: modern bir yüzde çatlak, eskilik değil hasar gibi duruyor.
- Kontroller üç gruba ayrıldı: **The brush** (intensity, fırça, keskinlik, kontur, denoise), **The paint** (impasto, warmth, contrast, saturation), **The surface** (kanvas, vinyet, çatlak).

**Dokuma deseni iki denemede oturdu.** İlk hali `sin(p·π)` kullanıyordu; bu fonksiyon hücreden hücreye işaret değiştirdiği için iplik değil dama tahtası gibi görünüyor ve göze doku olarak ulaşmıyordu. Her hücrede parabolik bir "iplik sırtı" ve üstte hangi ipliğin olduğunu belirleyen bir dama deseni ile değiştirildi; artık keten dokusu okunuyor.

**Yanlış teşhisten dönüldü:** Yüzdeki yatay şeritlerin kanvas dokusundan geldiğini sandım. Kanvas ve impasto sıfırlanınca şeritler durunca anlaşıldı ki kaynağı Kuwahara'nın kendisi. Yumuşak geçişli bölgelerde eş-parlaklık çizgileri yataya yakındır, darbeler de onları takip ettiği için yatay uzuyor. Yani hata değil, filtrenin doğru çalışması — gerçek bir ressamın yaptığı da budur.

**Yön düzeltmesi (2026-11-13) — Aliyev'in geri bildirimi:**

Aliyev referans olarak Zonaro'nun *Fatih'in İstanbul'a Girişi* tablosunu gösterdi, ama asıl istediğini şöyle netleştirdi: **paletin kopyalanmasını değil, boyanmışlık hissini istiyor.** Bir evin fotoğrafı yüklendiğinde ev aynı renkte kalmalı, sadece elle boyanmış gibi görünmeli. Kırmızı bir kıyafet kırmızı kalmalı.

Bu, o ana kadarki varsayılanların yanlış yönde olduğu anlamına geliyordu: sıcak tonlama fazla açıktı ve her fotoğrafa sepya bir karakter dayatıyordu.

**Yapılan değişiklikler:**
- Varsayılanlar "renge sadık" hale getirildi: `warmth` 0.7 → 0.2, `contrast` 0.45 → 0.25, `saturation` 0.85 → 1.0, `vignette` 0.5 → 0.3. Eski usta paleti artık dayatma değil, Warmth kaydıracında ve presetlerde bir **seçenek**.
- `shaders/stroke.ts` eklendi (boru hattında 6. adım). İki iş yapıyor:
  1. **Düzensiz darbe kenarları.** Kuwahara'nın kenarları makine düzgünlüğünde ve göz bunu "filtrelenmiş fotoğraf" diye okuyor. Yüklü bir fırça temiz kenar bırakmaz. Her piksel okunmadan önce akış yönünde gürültülü bir miktar kaydırılıyor — rastgele yönde değil akış boyunca, çünkü rastgele itiş bulandırır, akış boyunca çekiş fırçanın yaptığı gibi uzatır.
  2. **Darbeden darbeye ton farkı.** Asıl eksik olan buydu. Kuwahara bölgeleri kusursuz düz bırakıyor; hiçbir ressam düz alan sürmez, her darbe biraz farklı yüklüdür. Düz renk baskının imzasıdır, boyanın değil. Gürültü, akış yönünde gerilmiş bir koordinat sisteminde örnekleniyor, böylece değişim leke değil **darbe biçimli** çıkıyor.
- Yeni kaydıraç: **Stroke irregularity**. PROJECT.md 3.4'teki listede yok; kalite hedefi için eklendi.

**Sırada 3c:** 5 preset, tam kalite render, PNG/JPEG indirme, altın çerçeve + künye bindirmesi, CPU fallback.

> **Claude Code'a not:** Kuwahara'nın yönlü (anizotropik) versiyonunu kullan, basit kare-blok Kuwahara yetersiz kalır ve "poster filtresi" gibi görünür. Fırça darbeleri görüntünün konturlarını takip etmeli. Bu fazda kaliteden ödün verme — gerekirse bu fazı 3 alt adımda yap ve her birinde bana ekran görüntüsü göster.

---

### ◻ FAZ 4 — Supabase ve giriş sistemi
**Amaç:** Hesap altyapısı. Henüz kayıt özelliği yok, sadece giriş/çıkış.

- [ ] Supabase projesi oluştur (bölge: Frankfurt — Bakü'ye en yakın ücretsiz bölge)
- [ ] `.env.local` + Vercel environment variables (URL ve ANON_KEY)
- [ ] `@supabase/supabase-js` + `@supabase/ssr` kurulumu
- [ ] `lib/supabase/client.ts` ve `lib/supabase/server.ts`
- [ ] `/login`: kayıt ol / giriş yap (sekmeli), e-posta doğrulama akışı
- [ ] Header'da oturum durumu (Sign in ↔ avatar + Sign out)
- [ ] `middleware.ts` ile oturum yenileme
- [ ] `/gallery` korumalı rota (giriş yoksa `/login`'e yönlendir)
- [ ] Commit + push, canlıda giriş testi

**Kabul kriteri:** Canlı sitede kayıt olup e-postayı doğrulayıp giriş yapabiliyorum, sayfayı yenileyince oturum kaybolmuyor.

---

### ◻ FAZ 5 — Kaydetme ve galeri
**Amaç:** Tabloları kalıcı saklamak. Kota kuralları burada uygulanır.

- [ ] Bölüm 5'teki SQL'i Supabase SQL Editor'da çalıştır (tablo + RLS + trigger)
- [ ] `paintings` bucket'ı (private) + storage policy'leri
- [ ] "Save to gallery" butonu (sadece giriş yapmışsa aktif; değilse "Sign in to save" ipucu)
- [ ] Yükleme öncesi: 1600px'e küçült, JPEG 0.82, 400px thumbnail üret
- [ ] Storage'a iki dosya + veritabanına satır
- [ ] `/gallery`: thumbnail grid, altın çerçeve + künye (title, preset, tarih)
- [ ] Tabloya tıklayınca signed URL ile tam boyut görüntüle + indir
- [ ] Silme (storage dosyaları + db satırı birlikte)
- [ ] Kota hatası (`QUOTA_EXCEEDED`) için anlaşılır mesaj: *"You've reached 20 saved paintings. Delete one to save a new one."*
- [ ] Commit + push

**Kabul kriteri:** Kaydettiğim tablo galeride görünüyor, çıkış yapıp başka hesapla girince **görünmüyor** (RLS çalışıyor). Sildiğimde Supabase Storage'da da dosya kalmıyor.

---

### ◻ FAZ 6 — Cilalama (polish)
- [ ] Tüm async işlemler için loading/skeleton durumları
- [ ] Hata sınırları (error boundary) ve kullanıcı dostu hata sayfaları
- [ ] Boş durumlar ("Your gallery is empty — go paint something")
- [ ] Mobil: dokunmatik slider, dikey yerleşim, 320px testi
- [ ] Erişilebilirlik: klavye ile gezinme, focus görünürlüğü, alt metinler, kontrast AA
- [ ] SEO: metadata, OpenGraph görseli, favicon, `sitemap.ts`, `robots.ts`
- [ ] Lighthouse: Performance ve Accessibility ≥ 90
- [ ] Commit + push

---

### ◻ FAZ 7 — Güvenlik ve kota denetimi
- [ ] Bölüm 6'daki 9 maddeyi tek tek kontrol et ve raporla
- [ ] `next.config.ts` güvenlik başlıklarını ekle ve tarayıcıda doğrula
- [ ] İkinci bir hesap açıp başkasının verisine erişmeyi dene — **erişilememeli**
- [ ] Doğrudan Supabase REST endpoint'ine token'sız istek at — reddedilmeli
- [ ] EXIF'in gerçekten silindiğini doğrula
- [ ] `npm audit` — kritik açık varsa düzelt
- [ ] Repoda secret taraması (`git log -p | grep -i key`)
- [ ] Commit + push

**Kabul kriteri:** Yazılı bir güvenlik kontrol raporu, 9 maddenin tamamı ✅.

---

### ◻ FAZ 8 — Yayın ve opsiyoneller
- [ ] `README.md`: ekran görüntüleri, nasıl çalışır, kurulum adımları, teknoloji listesi (portföy için önemli)
- [ ] Vercel production domain'i düzenle (`patina-art.vercel.app` gibi)
- [ ] Opsiyonel: GitHub Actions ile haftalık Supabase ping (uyku koruması)
- [ ] Opsiyonel: public galeri (başkalarının paylaştığı tablolar) — **ayrıca konuşulacak**
- [ ] Opsiyonel: ücretsiz özel alan adı varsa bağla

---

## 8. GIT İŞ AKIŞI (Her fazda aynı)

```bash
git checkout -b faz-3-oil-engine     # 1. Faz için dal aç
# ... kodla ...
npm run build                        # 2. Hata yok mu kontrol
git add .
git commit -m "feat(engine): anisotropic Kuwahara oil paint pipeline"
git push -u origin faz-3-oil-engine  # 3. GitHub'a gönder
# 4. GitHub'da Pull Request aç -> Vercel otomatik "Preview" linki üretir
# 5. Preview linkini test et
# 6. PR'ı merge et -> production otomatik güncellenir
git checkout main && git pull        # 7. Yerelde güncelle
```

**Commit mesaj formatı:** `feat:` yeni özellik · `fix:` hata · `style:` görünüm · `docs:` döküman · `chore:` ufak işler · `refactor:` kod düzenleme

---

## 9. CLAUDE CODE İÇİN KURALLAR

1. **Bu dosya tek doğru kaynaktır.** Her oturumun başında oku. Bölüm 1'deki kararlar tartışılmaz.
2. **Sırayla git.** Bir faz bitti → `npm run build` temiz → commit → **DUR ve Aliyev'in onayını bekle.** Fazları atlamayarak ilerle.
3. **Her faz sonunda bu dosyadaki `◻` işaretini `✅` yap** ve altına 2-3 satır "ne yapıldı" notu ekle.
4. **Türkçe açıkla.** Kod İngilizce, ama her yeni dosya/konsept için Türkçe 2-3 cümle: "Bu dosya ne işe yarıyor, neden gerekli." Aliyev'in ilk projesi — öğrenmesi, kodun bitmesinden daha önemli.
5. **Yeni npm paketi kurmadan önce SOR.** Gereksiz bağımlılık eklemeyeceksin. (`@supabase/supabase-js`, `@supabase/ssr` zaten onaylı.)
6. **Ücretli hiçbir şey eklemeyeceksin.** Ücretli bir servis gerektiğini düşünüyorsan dur ve sor.
7. **Secret yazmayacaksın.** Anahtarlar sadece `.env.local` ve Vercel panelinde.
8. **Anlamadığın veya iki yolu olan bir karar varsa SOR.** Kendi başına mimari karar verme. Aliyev açıkça bunu istedi.
9. **Hata olduğunda gizlemeyeceksin.** Çalışmayan bir şeyi "tamam" diye işaretleme. Çözemiyorsan ne denediğini yaz ve sor.
10. **Tek seferde çok şey yapma.** Bir fazı bile gerekirse alt adımlara böl, her adımda çalıştığını göster.

---

## 10. KAPSAM DIŞI (Bu projede YAPILMAYACAK)

- Ödeme, abonelik, reklam, premium plan — para kazanılmayacak
- Herhangi bir AI API entegrasyonu
- Video işleme
- Mobil uygulama (sadece mobil uyumlu web)
- Sosyal özellikler (yorum, beğeni, takip)
- Çok dilli arayüz (sadece İngilizce)
- E-posta bülteni, bildirim sistemi
- Analytics / kullanıcı takibi

---

## 11. İLERLEME TAKİBİ

| Faz | Durum | Tarih | Not |
|---|---|---|---|
| FAZ 0 — Kurulum & ilk deploy | ✅ Bitti | 2026-11-09 | Site canlı: patina-steel-nine.vercel.app. push → otomatik deploy zinciri test edildi ve çalışıyor. |
| FAZ 1 — Tasarım sistemi | ✅ Bitti | 2026-11-12 | Palet, fontlar, 7 bileşen, landing + about. 320px'de taşma yok, canlıda doğrulandı. |
| FAZ 2 — Yükleme & önizleme | ✅ Bitti | 2026-11-12 | DropZone, magic bytes, EXIF düzeltme, 2048px küçültme. 8 senaryo tarayıcıda test edildi. |
| FAZ 3 — Yağlı boya motoru | 🔄 3a + 3b bitti | 2026-11-13 | 11 geçişli boru hattı çalışıyor: fırça, impasto, tonlama, kanvas, çatlak, vernik. Sırada presetler ve indirme. |
| FAZ 4 — Supabase & Auth | ◻ Bekliyor | | |
| FAZ 5 — Kaydetme & galeri | ◻ Bekliyor | | |
| FAZ 6 — Cilalama | ◻ Bekliyor | | |
| FAZ 7 — Güvenlik denetimi | ◻ Bekliyor | | |
| FAZ 8 — Yayın | ◻ Bekliyor | | |

---

## 12. AÇIK SORULAR (Aliyev cevaplayınca Claude Code devam eder)

Şu an açık soru yok. Yeni bir karar gerektiğinde Claude Code buraya yazacak ve duracak.

---

*Oluşturma: 2026-11-06 · Sahibi: Aliyev (Bakü) · Lisans: MIT (öneri)*
