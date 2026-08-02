# Meaw Tools Roadmap

แนวทางหลักคือทำเครื่องมือที่จบงานได้ในหน้าเดียว ใช้ได้ฟรี ประมวลผลใน Browser ก่อน และเพิ่มบริการฝั่ง Server เฉพาะเมื่อมีคุณค่าชัดเจน เครื่องมือที่เกี่ยวกับเอกสารสำคัญต้องไม่เก็บข้อมูลโดยไม่จำเป็น

## ชุดที่ส่งมอบแล้ว

| ลำดับ | เครื่องมือ | กลุ่มผู้ใช้ | คุณค่าหลัก | สถานะ |
|---:|---|---|---|---|
| 1 | Word Counter | นักเขียน, SEO, นักเรียน | นับคำไทยและเวลาอ่าน | พร้อมใช้ |
| 2 | Text Cleaner | ธุรการ, ฝ่ายขาย, Data Entry | ล้างช่องว่างและบรรทัดซ้ำ | พร้อมใช้ |
| 3 | Percentage Calculator | ฝ่ายขาย, บัญชี, เจ้าของร้าน | คำนวณส่วนลด สัดส่วน และการเติบโต | พร้อมใช้ |
| 4 | Unit Converter | ช่าง, โลจิสติกส์, อสังหา | แปลงหน่วยทั่วไปและพื้นที่ไทย | พร้อมใช้ |
| 5 | Date Calculator | HR, PM, ธุรการ | หาระยะเวลาและวันทำงาน | พร้อมใช้ |
| 6 | JPG to PDF Converter | บุคคลทั่วไป, ธุรการ, ร้านค้า | รวมและเรียงรูปเป็น PDF โดยไม่อัปโหลด | พร้อมใช้ |
| 7 | QR Code Generator | ร้านค้า, Event, Marketing | สร้าง QR พร้อม PNG/SVG | พร้อมใช้ |
| 8 | Age Calculator | บุคคลทั่วไป, HR | คำนวณอายุและวันเกิดครั้งถัดไป | พร้อมใช้ |
| 9 | Loan Calculator | บุคคลทั่วไป, ฝ่ายขาย | ค่างวดและตารางลดต้นลดดอก | พร้อมใช้ |
| 10 | BMI Calculator | ผู้ใหญ่ทั่วไป | BMI และช่วงน้ำหนักอ้างอิงพร้อมข้อจำกัด | พร้อมใช้ |
| 11 | Profit & Margin Calculator | ร้านค้า, SME | กำไร Margin และ Markup | พร้อมใช้ |
| 12 | PNG to JPG Converter | ร้านค้าออนไลน์, Content | แปลง PNG/WebP พร้อมกำหนดพื้นหลัง | พร้อมใช้ |
| 13 | Image Compressor & Resizer | ร้านค้าออนไลน์, Content | ย่อและบีบอัดรูปโดยไม่อัปโหลด | พร้อมใช้ |
| 14 | Color Picker & Contrast Checker | Designer, Frontend | แปลงค่าสี สร้างเฉด และตรวจ WCAG | พร้อมใช้ |
| 15 | Password Generator | ทุกสายงาน | สร้างรหัสผ่านด้วย Web Crypto | พร้อมใช้ |
| 16 | Random Number Generator | บุคคลทั่วไป, ครู, Event | สุ่มเลขไม่ซ้ำและตัวเลือกด่วน | พร้อมใช้ |
| 17 | PDF to JPG Converter | บุคคลทั่วไป, ธุรการ, ร้านค้า | แปลงหน้าที่เลือกเป็น JPG/ZIP โดยไม่อัปโหลด | พร้อมใช้ |
| 18 | Merge PDF | บุคคลทั่วไป, ธุรการ, นักเรียน | เรียงและรวม PDF หลายไฟล์ใน Browser | พร้อมใช้ |
| 19 | Split PDF | บุคคลทั่วไป, ธุรการ, นักเรียน | แยกช่วงหน้าเป็น PDF/ZIP | พร้อมใช้ |
| 20 | Random Wheel | ครู, นักเรียน, Event, ทีมงาน | สุ่มชื่อและตัวเลือกด้วย Web Crypto พร้อมประวัติ | พร้อมใช้ |
| 21 | Buddhist Year Converter | บุคคลทั่วไป, ธุรการ, HR | แปลง พ.ศ.–ค.ศ. แบบหลายรายการพร้อมสูตร Excel | พร้อมใช้ |
| 22 | AI Background Remover | ร้านค้า, Content, บุคคลทั่วไป | ลบพื้นหลังเป็น PNG ภายใน Browser โดยไม่อัปโหลดรูป | พร้อมใช้ |

## หลักฐาน Google Trends ประเทศไทย

ตรวจวันที่ 3 สิงหาคม 2026 ช่วง 12 เดือนย้อนหลัง ประเภท Web Search:

- คำอังกฤษ: `pdf to jpg` เฉลี่ย 76, `merge pdf` 15, `compress pdf` 6 และ `split pdf` 5
- คำไทย: `รวม pdf` เฉลี่ย 81, `แปลง pdf เป็น jpg` 41, `แยก pdf` 14 และ `ลดขนาด pdf` 4
- กลุ่ม `vat calculator`, `json to csv` และ `csv cleaner` มีข้อมูลต่ำมากเมื่อเทียบในชุดเดียวกัน จึงเลื่อน Batch สำนักงานออกไป
- ไม่เปิด PDF Compressor แม้มีความสนใจ เพราะยังลดขนาดจริงอย่างสม่ำเสมอโดยไม่ลดคุณภาพหรือทำเอกสารเสียไม่ได้
- รอบเครื่องมือไทยทั่วไป: `วงล้อสุ่ม` เฉลี่ย 59 และ `พ.ศ. ค.ศ.` 35 สูงกว่า `คำนวณเกรด` 2, `จับเวลาออนไลน์` 1 และ `คำนวณ vat` 0 ในชุดเปรียบเทียบเดียวกัน
- รอบทบทวนเครื่องมือภาพเทียบกับ Anchor ที่ส่งมอบแล้ว: `ลบพื้นหลัง` 60, `วงล้อสุ่ม` 59, `แปลงรูปเป็นข้อความ` 1, `ทำรูปติดบัตร` 1 และ `ครอปรูป` 1 ในชุดเดียวกัน

## Backlog ที่จัดลำดับแล้ว

คะแนน 5 คือสูงที่สุด ช่องรายได้หมายถึงโอกาสเพิ่มหน้า SEO และรายได้ AdSense โดยไม่ล็อกฟังก์ชันหลักไว้หลังการชำระเงิน

| อันดับ | เครื่องมือ | กลุ่มผู้ใช้ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | แนวทาง |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | VAT Calculator | ร้านค้า, ฝ่ายขาย | 1 | 4 | 4 | 4 | 2 | Client-only |
| 2 | CSV Cleaner + Duplicate Finder | ธุรการ, Data Analyst | 3 | 5 | 4 | 5 | 3 | Client-only |
| 3 | Workday Planner พร้อมวันหยุดไทย | HR, PM | 3 | 5 | 4 | 4 | 3 | ชุดข้อมูลวันหยุดแบบ versioned |
| 4 | JSON / CSV Converter | Developer, Data | 2 | 4 | 4 | 5 | 2 | Client-only |
| 5 | Markdown Preview + Export | Writer, Developer | 3 | 4 | 4 | 4 | 3 | Client-only |
| 6 | Salary / Overtime Estimator | HR, พนักงาน | 3 | 5 | 5 | 4 | 3 | ต้องระบุว่าเป็นค่าประมาณ |
| 7 | Invoice / Quote Number Generator | SME, Freelancer | 2 | 4 | 4 | 4 | 2 | Client-only |
| 8 | YAML / JSON Converter | DevOps, Developer | 2 | 4 | 3 | 4 | 2 | Client-only |
| 9 | XML Formatter / Validator | Enterprise, Developer | 3 | 4 | 3 | 4 | 2 | Parser ที่ปิด external entities |
| 10 | Favicon / PWA Icon Generator | เจ้าของเว็บ, Designer | 3 | 4 | 4 | 4 | 3 | Client-only |
| 11 | EXIF Viewer / Remover | ช่างภาพ, Privacy | 3 | 4 | 4 | 4 | 4 | Client-only |
| 12 | UTM Builder | Marketing, Ads | 1 | 3 | 3 | 4 | 2 | เลื่อนลงหลัง Trends มีข้อมูลน้อย |
| 13 | Meta Tag + Open Graph Builder | SEO, เจ้าของเว็บ | 2 | 3 | 3 | 4 | 3 | เลื่อนลงหลัง Trends มีข้อมูลน้อย |

## ลำดับส่งมอบที่แนะนำ

1. Batch 3 — ภาพสำหรับร้านค้า: PNG/WebP เป็น JPG, บีบอัดและย่อขนาด — ส่งมอบแล้ว
2. Batch 4 — Popular Utilities: Color Picker/Contrast, Password และ Random Number — ส่งมอบแล้ว
3. Batch 5 — PDF Utilities: PDF to JPG, Merge PDF, Split PDF — ส่งมอบแล้ว
4. Batch 6 — เครื่องมือไทยที่มี demand สูง: Random Wheel และ Buddhist Year Converter — ส่งมอบแล้ว
5. Batch 7 — AI Background Remover แบบ client-only และ lazy model — ส่งมอบแล้ว
6. Batch 8 — ข้อมูลสำนักงาน: CSV Cleaner, JSON/CSV, Markdown หลังทบทวนคำค้นใหม่
7. Batch 9 — VAT และใบเสนอราคา หลังทบทวนข้อกำหนดภาษี/เอกสารล่าสุด

ทุก Batch ควรมี unit test ของสูตรหรือ parser, E2E อย่างน้อยหนึ่งเส้นทาง, ตรวจ keyboard/mobile และวัด Core Web Vitals ก่อนเปิด AdSense ใน production

## งานที่ชะลอไว้หลังการวิจัย

- PDF Compressor: ยังไม่ควรเปิดตัวจนกว่าจะลดขนาดได้จริงอย่างสม่ำเสมอและไม่ทำให้เอกสารเสียหาย
