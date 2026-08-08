# SEO Strategy — Meaw Tools

อัปเดตล่าสุด: 8 สิงหาคม 2026

## หลักการ

เป้าหมายคือทำให้ทุกหน้ามี search intent ชัด ค้นพบได้ และมีคุณค่าพอให้ผู้ใช้ทำงานจบ ไม่ใช่รับประกันอันดับหน้าแรก ซึ่งขึ้นกับคู่แข่ง ความน่าเชื่อถือ backlinks และสัญญาณภายนอกที่โค้ดควบคุมไม่ได้

Google ระบุว่าควรใช้ title และ description ที่กระชับ ไม่ซ้ำ และอธิบายเนื้อหาจริง พร้อมหลีกเลี่ยง keyword stuffing ดังนั้น Meaw Tools ไม่ใช้ `<meta name="keywords">` และไม่สร้างหน้าใกล้เคียงกันจำนวนมากเพื่อจับคำค้น

## Keyword source of truth

- `src/config/tools.ts` คือแหล่งข้อมูลกลางของทุกหน้าเครื่องมือ
- `keywords[0]` คือ primary keyword ของหน้า ต้องไม่ซ้ำกับหน้าอื่น
- keyword ลำดับถัดไปเป็น supporting intents สำหรับคำอธิบาย วิธีใช้ FAQ และ internal search ไม่ใช่รายการคำสำหรับยัดลงหน้า
- `thaiName` และ `name` ใช้สร้าง title ไทย–อังกฤษเมื่อความยาวเหมาะสม
- `description`, `howTo`, `example`, `caution` และ `faq` ต้องตอบ intent จริงของเครื่องมือ
- `relatedTools` เป็น internal links ตามงานที่ผู้ใช้อาจทำต่อ ไม่ใช่ลิงก์เพื่อปั่นอันดับ

## Automated release gate

`src/lib/seo/tool-seo.test.ts` ตรวจทุก tool route ว่า:

- slug, ชื่อไทย, ชื่ออังกฤษ, primary keyword และ title ไม่ซ้ำ
- title/description มีเนื้อหาและความยาวเหมาะสม
- แต่ละหน้ามีอย่างน้อย 5 keywords, วิธีใช้ 3 ขั้น, FAQ 2 ข้อ และ related tools 3 หน้า
- internal links มีปลายทางจริงและไม่ลิงก์กลับหน้าตัวเอง
- metadata ใช้ canonical เฉพาะหน้าและเปิด index/follow

## การวัดผลจริง

หลัง deploy ให้ใช้ Google Search Console วัดรายหน้าเป็นรอบ 28 วัน:

1. Indexing และ canonical ที่ Google เลือก
2. Queries, impressions, clicks, CTR และ average position ของ primary intent
3. หน้า/คำค้นที่ชนกัน เพื่อรวมเนื้อหาหรือปรับ intent ไม่ให้ cannibalize
4. CTR ต่ำแต่มี impression ให้ทดลอง title/description โดยไม่เปลี่ยน URL
5. หน้าที่ไม่มี impression ต่อเนื่องต้องทบทวนคุณค่า ความแตกต่าง และ internal links ก่อนสร้างหน้าใหม่

## แหล่งอ้างอิง

- [Google Search Central — Title links](https://developers.google.com/search/docs/appearance/title-link)
- [Google Search Central — Snippets and meta descriptions](https://developers.google.com/search/docs/appearance/snippet)
- [Google Search Central — Helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central — Spam policies and keyword stuffing](https://developers.google.com/search/docs/essentials/spam-policies)
