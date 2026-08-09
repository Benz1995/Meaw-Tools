# Tool Demand Research — Thailand

สำรวจเมื่อ 2 สิงหาคม 2026 ด้วย Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search เพื่อใช้จัดลำดับเครื่องมือใหม่ คะแนนเป็นค่าความสนใจสัมพัทธ์ที่ Google ทำ normalization แล้ว ไม่ใช่จำนวนการค้นหาจริง และไม่ควรเปรียบเทียบคะแนนจากคนละกลุ่มเป็นค่าดิบโดยตรง

เอกสารอ้างอิง: [เปรียบเทียบคำค้นใน Google Trends](https://support.google.com/trends/answer/4359550) และ [คำถามที่พบบ่อยเกี่ยวกับข้อมูล Google Trends](https://support.google.com/trends/answer/4365533)

## ผลที่ใช้ตัดสินใจ

| กลุ่มเปรียบเทียบ | คำค้น | ค่าเฉลี่ย |
|---|---|---:|
| 1 | สร้าง qr code | 65 |
| 1 | คำนวณอายุ | 13 |
| 1 | ลดขนาดรูป | 5 |
| 1 | คำนวณเปอร์เซ็นต์ | 2 |
| 1 | คำนวณ vat | 1 |
| 2 | แปลง jpg เป็น pdf | 77 |
| 2 | สร้าง qr code | 26 |
| 2 | บีบอัด pdf | 13 |
| 2 | คำนวณอายุ | 5 |
| 2 | คำนวณ bmi | 3 |
| 3 | แปลง jpg เป็น pdf | 77 |
| 3 | ลบพื้นหลัง | 71 |
| 3 | สร้าง qr code | 26 |
| 3 | แปลง png เป็น jpg | 3 |
| 3 | ลดขนาดรูป | 2 |
| 4 | แปลง jpg เป็น pdf | 77 |
| 4 | สร้าง qr code | 26 |
| 4 | คำนวณภาษี | 8 |
| 4 | คำนวณเงินเดือน | 3 |
| 4 | คำนวณดอกเบี้ย | 3 |

## การตัดสินใจ

ส่งมอบ JPG to PDF, QR Code Generator และ Age Calculator ก่อน เพราะทำงานแบบ client-only ได้อย่างตรงไปตรงมา มีประโยชน์กับผู้ใช้หลายกลุ่ม และไม่ต้องส่งไฟล์หรือข้อมูลขึ้น Server

ยังไม่ส่งมอบ Background Remover แม้ความสนใจสูง เพราะต้องใช้โมเดล ML ขนาดใหญ่ และยังไม่ส่งมอบ PDF Compressor เพราะการลดขนาดให้ได้ผลจริงโดยไม่ทำลายคุณภาพเอกสารต้องมีการทดสอบและข้อจำกัดที่ชัดเจนกว่านี้

## รอบที่ 2 — เครื่องคำนวณที่คนไทยค้นหา

เปรียบเทียบใน Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search ภายในกลุ่มเดียวกัน:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| คำนวณดอกเบี้ย | 72 |
| คำนวณ bmi | 57 |
| คำนวณกำไร | 27 |
| คำนวณ vat | 9 |
| คำนวณส่วนลด | 0 |

จึงส่งมอบ Loan Calculator, BMI Calculator และ Profit & Margin Calculator ก่อน VAT/ส่วนลด โดย Loan อ้างอิงหลักลดต้นลดดอกจาก [ธนาคารแห่งประเทศไทย](https://www.bot.or.th/th/satang-story/rights-responsibility/effectiverate.html) และ BMI ใช้สูตรกับช่วงอ้างอิงผู้ใหญ่จาก [องค์การอนามัยโลก](https://www.who.int/europe/news-room/fact-sheets/item/nutrition---maintaining-a-healthy-lifestyle)

## รอบที่ 3 — เครื่องมือรูปภาพสำหรับร้านค้าและงาน Content

เปรียบเทียบใน Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search ภายในกลุ่มเดียวกัน:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| แปลง png เป็น jpg | 54 |
| ลดขนาดรูป | 35 |
| แปลง webp เป็น jpg | 17 |
| บีบอัดรูป | 16 |
| ครอปรูป | 11 |

จึงส่งมอบ PNG to JPG Converter ที่รองรับ PNG/WebP และ Image Compressor & Resizer ก่อนเครื่องมือครอปรูป ทั้งสองตัวทำงานด้วย Canvas ภายใน Browser จำกัดไฟล์ 10 MB ด้านยาว 8,000 พิกเซล และความละเอียดรวม 40 ล้านพิกเซลเพื่อลดความเสี่ยงด้านหน่วยความจำ

## รอบที่ 4 — ทบทวน Marketing/SEO และขยายไปยัง Popular Utilities

กลุ่ม Marketing/SEO เดิมมีสัญญาณต่ำเมื่อเทียบกับเครื่องมือที่ส่งมอบแล้วภายในกลุ่มเดียวกัน:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| qr code generator | 59 |
| word counter | 5 |
| utm builder | 0 |
| meta tag generator | 0 |
| contrast checker | 0 |

จึงไม่ทำ UTM และ Meta Tag เพียงเพื่อเพิ่มจำนวนหน้า แต่ทดสอบกลุ่มเครื่องมือทั่วไปเพิ่มเติม พบผลภายในกลุ่มเดียวกันดังนี้:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| color picker | 30 |
| password generator | 27 |
| random number generator | 20 |
| character counter | 0 |
| text case converter | 0 |

จึงส่งมอบ Color Picker & Contrast Checker, Password Generator และ Random Number Generator โดย Color Picker รวมการตรวจ WCAG เพื่อให้มีคุณค่ามากกว่าการเลือกสีอย่างเดียว ส่วนเครื่องมือสุ่มทั้งสองใช้ Web Crypto และหลีกเลี่ยง modulo bias

## รอบที่ 5 — เครื่องมือคนไทยใช้ในห้องเรียน กิจกรรม และงานเอกสาร

สำรวจเมื่อ 3 สิงหาคม 2026 ใน Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search และเปรียบเทียบคำในกลุ่มเดียวกัน:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| วงล้อสุ่ม | 59 |
| พ.ศ. ค.ศ. | 35 |
| คำนวณเกรด | 2 |
| จับเวลาออนไลน์ | 1 |
| คำนวณ vat | 0 |

ผลกลุ่มย่อยยังพบว่า `วงล้อสุ่ม` สูงกว่า `สุ่มชื่อ`, `แบ่งกลุ่ม` และ `สุ่มกลุ่ม` อย่างชัดเจน ส่วนคำที่เกี่ยวข้องกับ `พ.ศ. ค.ศ.` มีคำถามตามปีปัจจุบัน เช่น “พ.ศ. 2569 ค.ศ. อะไร” และ “2026 พ.ศ. อะไร” เพิ่มขึ้นมาก จึงส่งมอบ Random Wheel และ Buddhist Year Converter ก่อน Batch ข้อมูลสำนักงานเดิม

ลิงก์ชุดเปรียบเทียบ: [Google Trends ประเทศไทย — วงล้อสุ่ม, คำนวณเกรด, พ.ศ. ค.ศ., VAT และจับเวลา](https://trends.google.com/trends/explore?geo=TH&date=today%2012-m&q=%E0%B8%A7%E0%B8%87%E0%B8%A5%E0%B9%89%E0%B8%AD%E0%B8%AA%E0%B8%B8%E0%B9%88%E0%B8%A1,%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B9%80%E0%B8%81%E0%B8%A3%E0%B8%94,%E0%B8%9E.%E0%B8%A8.%20%E0%B8%84.%E0%B8%A8.,%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%20vat,%E0%B8%88%E0%B8%B1%E0%B8%9A%E0%B9%80%E0%B8%A7%E0%B8%A5%E0%B8%B2%E0%B8%AD%E0%B8%AD%E0%B8%99%E0%B9%84%E0%B8%A5%E0%B8%99%E0%B9%8C)

## รอบที่ 6 — ทบทวนเครื่องมือภาพด้วย Anchor ที่ส่งมอบแล้ว

สำรวจเมื่อ 3 สิงหาคม 2026 ใน Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search และเปรียบเทียบคำในกลุ่มเดียวกัน:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| ลบพื้นหลัง | 60 |
| วงล้อสุ่ม | 59 |
| แปลงรูปเป็นข้อความ | 1 |
| ทำรูปติดบัตร | 1 |
| ครอปรูป | 1 |

`ลบพื้นหลัง` มีความสนใจระดับเดียวกับ `วงล้อสุ่ม` ซึ่งเป็นเครื่องมือที่ส่งมอบแล้ว และสูงกว่าตัวเลือกภาพอื่นในชุดเดียวกันอย่างชัดเจน จึงทบทวนข้อจำกัดเดิมและส่งมอบ Background Remover หลังพบแนวทางที่คุม performance และ license ได้: โหลด ONNX Runtime Web เฉพาะ route นี้เมื่อผู้ใช้กดประมวลผล ใช้โมเดล U-2-Netp ขนาด 4.58 MB โดย Runtime ใช้ MIT และโมเดลระบุ Apache-2.0 รูปประมวลผลใน Browser ส่วน AI Runtime และโมเดลรวมประมาณ 15–20 MB ในครั้งแรกและ Browser cache ไว้สำหรับครั้งถัดไป

ข้อจำกัดที่เปิดเผยใน UI คือโมเดลขนาดเล็กอาจพลาดขอบผม ขน เงา กระจก วัตถุโปร่งใส และฉากซับซ้อน เครื่องมือนี้จึงให้ผู้ใช้ตรวจผลบนพื้นโปร่งใส ขาว และชมพูก่อนดาวน์โหลด ไม่กล่าวอ้างว่าแม่นยำทุกภาพ

ลิงก์ชุดเปรียบเทียบ: [Google Trends ประเทศไทย — วงล้อสุ่ม, ลบพื้นหลัง, OCR, รูปติดบัตร และครอปรูป](https://trends.google.com/trends/explore?geo=TH&date=today%2012-m&q=%E0%B8%A7%E0%B8%87%E0%B8%A5%E0%B9%89%E0%B8%AD%E0%B8%AA%E0%B8%B8%E0%B9%88%E0%B8%A1,%E0%B8%A5%E0%B8%9A%E0%B8%9E%E0%B8%B7%E0%B9%89%E0%B8%99%E0%B8%AB%E0%B8%A5%E0%B8%B1%E0%B8%87,%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1,%E0%B8%97%E0%B8%B3%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B8%95%E0%B8%B4%E0%B8%94%E0%B8%9A%E0%B8%B1%E0%B8%95%E0%B8%A3,%E0%B8%84%E0%B8%A3%E0%B8%AD%E0%B8%9B%E0%B8%A3%E0%B8%B9%E0%B8%9B)

## รอบที่ 7 — Typing Test และเครื่องมือที่ทำได้จริงใน Browser

สำรวจเมื่อ 3 สิงหาคม 2026 ใน Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search โดยเริ่มจาก candidate ข้ามสายงาน:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| typing test | 69 |
| jpg to png | 32 |
| webp to jpg | 21 |
| qr code scanner | 8 |
| pomodoro timer | 1 |

เมื่อเจาะ intent การฝึกพิมพ์ภาษาไทย พบ `พิมพ์ดีด` 63, `ฝึกพิมพ์` 39, `พิมพ์สัมผัส` 12, `เกมพิมพ์ดีด` 5 และ `ฝึกพิมพ์ภาษาไทย` 4 ในชุดเดียวกัน ส่วนชุดอังกฤษ/ไทยพบ `ฝึกพิมพ์ดีด` 56 และ `typing test` 44 สูงกว่าคำเฉพาะอย่าง `typing speed test` 1 และ `wpm test` 0

จึงส่งมอบ Typing Test ภาษาไทย/อังกฤษก่อนเครื่องมือแปลง Word/PDF แม้ `word to pdf` และ `pdf to word` มีค่าเฉลี่ย 28 และ 27 ในชุดเอกสาร เพราะการแปลงไฟล์ Office ให้คง layout, ฟอนต์, ตาราง และองค์ประกอบทุกชนิดอย่างน่าเชื่อถือยังทำแบบ client-only ได้ไม่สม่ำเสมอ เครื่องมือ Typing Test ใช้ grapheme segmentation สำหรับสระ/วรรณยุกต์ไทย แสดงสูตร WPM/CPM อย่างโปร่งใส และไม่เก็บข้อความหรือผลทดสอบ

- [Google Trends — Typing Test, JPG/PNG, WebP, Pomodoro และ QR Scanner](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=webp%20to%20jpg,jpg%20to%20png,typing%20test,pomodoro%20timer,qr%20code%20scanner)
- [Google Trends — คำค้นการฝึกพิมพ์ภาษาไทย](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B8%9E%E0%B8%B4%E0%B8%A1%E0%B8%9E%E0%B9%8C%E0%B8%94%E0%B8%B5%E0%B8%94,%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%9E%E0%B8%B4%E0%B8%A1%E0%B8%9E%E0%B9%8C,%E0%B8%9E%E0%B8%B4%E0%B8%A1%E0%B8%9E%E0%B9%8C%E0%B8%AA%E0%B8%B1%E0%B8%A1%E0%B8%9C%E0%B8%B1%E0%B8%AA,%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%9E%E0%B8%B4%E0%B8%A1%E0%B8%9E%E0%B9%8C%E0%B8%A0%E0%B8%B2%E0%B8%A9%E0%B8%B2%E0%B9%84%E0%B8%97%E0%B8%A2,%E0%B9%80%E0%B8%81%E0%B8%A1%E0%B8%9E%E0%B8%B4%E0%B8%A1%E0%B8%9E%E0%B9%8C%E0%B8%94%E0%B8%B5%E0%B8%94)

## รอบที่ 8 — อักษรพิเศษ สัญลักษณ์ และเครื่องมือแต่งชื่อ

สำรวจเมื่อ 3 สิงหาคม 2026 ใน Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search โดยเทียบ candidate ข้าม backlog ในชุดเดียวกัน:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| ตัวอักษรพิเศษ | 75 |
| jpg to png | 8 |
| emoji copy | 4 |
| qr code scanner | 2 |
| csv cleaner | 0 |

ชุดเจาะ intent พบ `อักษรพิเศษ` 76, `ตัวอักษรพิเศษ` 24, `สัญลักษณ์พิเศษ` 6, `ตัวอักษรพิเศษภาษาอังกฤษ` 2 และ `ฟอนต์ตัวอักษรพิเศษ` 0 ค่าแต่ละชุดเป็นดัชนีสัมพัทธ์ จึงไม่ควรนำเลขจากคนละชุดมาเปรียบเทียบตรง ๆ แต่ทั้งสองชุดยืนยันว่าคำหลักมีสัญญาณสม่ำเสมอและสูงกว่า candidate ที่เหลือเมื่อเทียบโดยตรง

Related Queries ระบุ intent ที่ทำเป็น action ได้ เช่น รูปยิ้ม ปีกนางฟ้า คิตตี้ เลขโรมัน อักษร iPhone และข้อความเทศกาล จึงส่งมอบมากกว่าหน้า Symbol Copy: มีข้อความ Unicode 9 สไตล์ กรอบแต่งชื่อที่รองรับภาษาไทย ค้นหาด้วยคำไทย หมวดเฉพาะ และประวัติคัดลอกชั่วคราว พร้อมเปิดเผยว่า Unicode แต่ละชุดอาจแสดงต่างกันและไม่เหมาะแทนข้อความปกติในข้อมูลสำคัญ

- [Google Trends — อักษรพิเศษเทียบ Image, Emoji, QR และ CSV](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=jpg%20to%20png,emoji%20copy,%E0%B8%95%E0%B8%B1%E0%B8%A7%E0%B8%AD%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%A3%E0%B8%9E%E0%B8%B4%E0%B9%80%E0%B8%A8%E0%B8%A9,qr%20code%20scanner,csv%20cleaner)
- [Google Trends — เจาะคำค้นอักษรและสัญลักษณ์พิเศษ](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B8%95%E0%B8%B1%E0%B8%A7%E0%B8%AD%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%A3%E0%B8%9E%E0%B8%B4%E0%B9%80%E0%B8%A8%E0%B8%A9,%E0%B8%9F%E0%B8%AD%E0%B8%99%E0%B8%95%E0%B9%8C%E0%B8%95%E0%B8%B1%E0%B8%A7%E0%B8%AD%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%A3%E0%B8%9E%E0%B8%B4%E0%B9%80%E0%B8%A8%E0%B8%A9,%E0%B8%AA%E0%B8%B1%E0%B8%8D%E0%B8%A5%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%93%E0%B9%8C%E0%B8%9E%E0%B8%B4%E0%B9%80%E0%B8%A8%E0%B8%A9,%E0%B8%AD%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%A3%E0%B8%9E%E0%B8%B4%E0%B9%80%E0%B8%A8%E0%B8%A9,%E0%B8%95%E0%B8%B1%E0%B8%A7%E0%B8%AD%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%A3%E0%B8%9E%E0%B8%B4%E0%B9%80%E0%B8%A8%E0%B8%A9%E0%B8%A0%E0%B8%B2%E0%B8%A9%E0%B8%B2%E0%B8%AD%E0%B8%B1%E0%B8%87%E0%B8%81%E0%B8%A4%E0%B8%A9)

## รอบที่ 9 — QR Code Scanner เทียบเครื่องมือแปลงรูป

สำรวจเมื่อ 3 สิงหาคม 2026 ใน Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search ชุดคำไทยให้ค่าเฉลี่ยดังนี้:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| สแกน qr code | 74 |
| แปลงรูปเป็น jpg | 42 |
| แปลง jpg เป็น png | 41 |
| ลดขนาดรูป | 26 |
| อ่าน qr code | 12 |

ชุดภาษาอังกฤษ/คำเครื่องมือพบ `jpg to png` 64, `resize image` 44, `webp to jpg` 42, `qr scanner` 29 และ `qr code scanner` 16 ในชุดเดียวกัน ส่วนชุดเจาะ intent พบ `qr code reader` 14 และ Related Queries ของคำนี้มี `qr code reader for pc` เป็น Breakout กับ `qr code reader from image` เพิ่ม 350% คำยาวอย่าง `qr code scanner online` และคำไทย “จากรูป” มีข้อมูลน้อย จึงไม่ตีความว่าไม่มีความต้องการ

ตัดสินใจส่งมอบ QR Code Scanner เพราะมีสัญญาณภาษาไทยสูง มี action ใหม่จาก QR Generator ที่มีอยู่ และทำแบบฟรี client-only ได้จริง ขอบเขตคืออ่าน PNG/JPG/WebP ไม่เกิน 10 MB หรือกล้อง โหลด decoder เมื่อเริ่มใช้ หยุดกล้องเมื่ออ่านสำเร็จ ไม่เปิด URL อัตโนมัติ และแสดง hostname ก่อนให้ผู้ใช้เปิดเอง ทั้งนี้ Google Trends เป็นดัชนีสัมพัทธ์ ไม่ใช่จำนวนค้นหาจริง

- [Google Trends — JPG, WebP, QR Scanner และ Resize Image](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=jpg%20to%20png,webp%20to%20jpg,qr%20code%20scanner,qr%20scanner,resize%20image)
- [Google Trends — คำไทยแปลงรูปและสแกน QR](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%20jpg%20%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20png,%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20jpg,%E0%B8%A5%E0%B8%94%E0%B8%82%E0%B8%99%E0%B8%B2%E0%B8%94%E0%B8%A3%E0%B8%B9%E0%B8%9B,%E0%B8%AA%E0%B9%81%E0%B8%81%E0%B8%99%20qr%20code,%E0%B8%AD%E0%B9%88%E0%B8%B2%E0%B8%99%20qr%20code)
- [Google Trends — QR Reader Online และจากรูป](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=qr%20code%20reader,qr%20code%20scanner%20online,scan%20qr%20code%20online,%E0%B8%AA%E0%B9%81%E0%B8%81%E0%B8%99%20qr%20code%20%E0%B8%88%E0%B8%B2%E0%B8%81%E0%B8%A3%E0%B8%B9%E0%B8%9B,%E0%B8%AD%E0%B9%88%E0%B8%B2%E0%B8%99%20qr%20code%20%E0%B8%88%E0%B8%B2%E0%B8%81%E0%B8%A3%E0%B8%B9%E0%B8%9B)

## รอบที่ 10 — Image to Text OCR เทียบเครื่องมือรูปและข้อมูล

สำรวจเมื่อ 3 สิงหาคม 2026 ใน Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search ชุดภาษาอังกฤษพบ:

| คำค้น | ค่าเฉลี่ย |
|---|---:|
| jpg to png | 64 |
| image to text | 56 |
| csv cleaner | 0 |
| add watermark to photo | 0 |
| passport photo maker | 0 |

ชุดภาษาไทยพบ `แปลงรูปเป็นข้อความ` 52 สูงกว่า `แปลงรูปเป็น png` 41, `ทำรูปติดบัตร` 33, `ลบข้อมูลซ้ำ excel` 1 และ `ใส่ลายน้ำรูป` 1 เมื่อเจาะคำ OCR เพิ่มในชุดเดียวกัน พบ `แปลงรูปเป็นข้อความ` 52, `ocr ไทย` 5, `อ่านข้อความจากรูป` 2, `คัดลอกข้อความจากรูป` 1 และ `ดึงข้อความจากรูป` 0 คำที่ข้อมูลต่ำไม่ได้แปลว่าไม่มีผู้ใช้ แต่คำหลัก “แปลงรูปเป็นข้อความ” ให้ intent ตรงและสม่ำเสมอกว่า

จึงส่งมอบ Image to Text OCR ก่อน Batch Image Converter ซึ่งบางส่วนซ้ำกับ PNG/WebP to JPG ที่มีอยู่ ขอบเขตใหม่รองรับรูป PNG/JPG/WebP ภาษาไทย อังกฤษ หรือทั้งสองภาษา ปรับรูปขาวดำ/Contrast ได้ แก้ผลลัพธ์ก่อนคัดลอกหรือดาวน์โหลด และ self-host Tesseract.js WebAssembly กับโมเดลภาษาโดยไม่ส่งรูปออกจาก Browser ครั้งแรกดาวน์โหลดสินทรัพย์ที่ใช้งานจริงประมาณ 8 MB และ Worker ถูกปิดหลังจบงาน ทั้งนี้ไม่รองรับ PDF/ลายมือและต้องตรวจผล OCR กับต้นฉบับ

- [Google Trends — Image to Text เทียบ JPG/PNG, CSV, Watermark และ Passport Photo](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=jpg%20to%20png,image%20to%20text,csv%20cleaner,add%20watermark%20to%20photo,passport%20photo%20maker)
- [Google Trends — แปลงรูปเป็นข้อความเทียบเครื่องมือรูปและ Excel](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20png,%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1,%E0%B8%A5%E0%B8%9A%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%A1%E0%B8%B9%E0%B8%A5%E0%B8%8B%E0%B9%89%E0%B8%B3%20excel,%E0%B9%83%E0%B8%AA%E0%B9%88%E0%B8%A5%E0%B8%B2%E0%B8%A2%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%A3%E0%B8%B9%E0%B8%9B,%E0%B8%97%E0%B8%B3%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B8%95%E0%B8%B4%E0%B8%94%E0%B8%9A%E0%B8%B1%E0%B8%95%E0%B8%A3)
- [Google Trends — เจาะ Intent OCR ภาษาไทย](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B8%84%E0%B8%B1%E0%B8%94%E0%B8%A5%E0%B8%AD%E0%B8%81%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B8%88%E0%B8%B2%E0%B8%81%E0%B8%A3%E0%B8%B9%E0%B8%9B,%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1,%E0%B8%AD%E0%B9%88%E0%B8%B2%E0%B8%99%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B8%88%E0%B8%B2%E0%B8%81%E0%B8%A3%E0%B8%B9%E0%B8%9B,%E0%B8%94%E0%B8%B6%E0%B8%87%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B8%88%E0%B8%B2%E0%B8%81%E0%B8%A3%E0%B8%B9%E0%B8%9B,ocr%20%E0%B9%84%E0%B8%97%E0%B8%A2)

## รอบที่ 11 — Text to Speech เทียบ Batch Converter และเครื่องมือสำนักงาน

สำรวจเมื่อ 3 สิงหาคม 2026 ใน Google Trends ประเทศไทย ช่วง 12 เดือนล่าสุด ประเภท Web Search เริ่มจากกลุ่มรูปภาพ พบ `แปลง jpg เป็น png` เฉลี่ย 61 สูงกว่า `แปลงรูปเป็น png` 21, `ทำรูปติดบัตร` 17, `ครอปรูป` 13 และ `ใส่ลายน้ำรูป` 0 จึงใช้คำแรกเป็น Anchor เทียบเครื่องมือสำนักงานต่อ

ชุดสำนักงานพบ `แปลงข้อความเป็นเสียง` 60, `แปลง jpg เป็น png` 55, `คำนวณเกรด` 37, `สร้างบาร์โค้ด` 37 และ `เครื่องคิดเลขค่าไฟ` 0 เมื่อเจาะ intent เสียงในชุดเดียวกัน พบ `อ่านข้อความ` 64, `text to speech` 43, `แปลงข้อความเป็นเสียง` 24, `แปลง jpg เป็น png` 22 และ `เสียงอ่านข้อความ` 6 ส่วนชุดคำอังกฤษพบ `text to speech` 69 สูงกว่า `jpg to png` 35, `countdown timer` 13, `barcode generator` 8 และ `photo collage` 8

จึงเลื่อน Image Format Batch Converter ไป Batch ถัดไปและส่งมอบ Text to Speech Reader ก่อน ขอบเขตใช้ Web Speech API ที่มีใน Browser/ระบบ รองรับไทยและอังกฤษ เลือกเสียง ความเร็ว ระดับเสียง และความดัง แบ่งข้อความยาวเป็นช่วง พัก อ่านต่อ และหยุดได้ จำกัด 20,000 ตัวอักษร และไม่อ้างว่าสร้าง MP3 ได้ Meaw Tools ไม่รับข้อความเข้าฝั่ง Server แต่เสียงออนไลน์บางรายการอาจประมวลผลกับผู้ให้บริการของ Browser หรือระบบปฏิบัติการ จึงแสดงคำเตือนเรื่องข้อมูลลับอย่างชัดเจน

Batch 21 ส่งมอบช่องว่างที่เหลือเป็นหน้า `JPG to PNG Batch Converter` โดยใช้คำหลักตรงกับ intent `แปลง jpg เป็น png` และ `jpg to png` แต่เพิ่มงานจริงที่เครื่องมือเดิมยังไม่มี: เลือกหลายไฟล์ JPG/PNG/WebP, ส่งออกทั้งชุดเป็น PNG/WebP/JPG, จำกัดทรัพยากร, ประมวลผลทีละรูป และดาวน์โหลด ZIP ภายใน Browser หน้าใหม่นี้ไม่แทนที่ `PNG to JPG` แบบไฟล์เดียวหรือ `Image Compressor & Resizer` ที่เน้นควบคุมขนาดภาพอย่างละเอียด

- [Google Trends — JPG/PNG, รูปติดบัตร, ลายน้ำ และครอปรูป](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%20jpg%20%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20png,%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20png,%E0%B8%97%E0%B8%B3%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B8%95%E0%B8%B4%E0%B8%94%E0%B8%9A%E0%B8%B1%E0%B8%95%E0%B8%A3,%E0%B9%83%E0%B8%AA%E0%B9%88%E0%B8%A5%E0%B8%B2%E0%B8%A2%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%A3%E0%B8%B9%E0%B8%9B,%E0%B8%84%E0%B8%A3%E0%B8%AD%E0%B8%9B%E0%B8%A3%E0%B8%B9%E0%B8%9B)
- [Google Trends — Text to Speech เทียบเครื่องมือสำนักงาน](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%20jpg%20%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20png,%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B9%80%E0%B8%81%E0%B8%A3%E0%B8%94,%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B8%84%E0%B8%B4%E0%B8%94%E0%B9%80%E0%B8%A5%E0%B8%82%E0%B8%84%E0%B9%88%E0%B8%B2%E0%B9%84%E0%B8%9F,%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%9A%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B9%82%E0%B8%84%E0%B9%89%E0%B8%94,%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B9%80%E0%B8%AA%E0%B8%B5%E0%B8%A2%E0%B8%87)
- [Google Trends — เจาะ Intent อ่านข้อความและเสียง](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B9%80%E0%B8%AA%E0%B8%B5%E0%B8%A2%E0%B8%87,text%20to%20speech,%E0%B8%AD%E0%B9%88%E0%B8%B2%E0%B8%99%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1,%E0%B9%80%E0%B8%AA%E0%B8%B5%E0%B8%A2%E0%B8%87%E0%B8%AD%E0%B9%88%E0%B8%B2%E0%B8%99%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1,%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%20jpg%20%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20png)
- [Google Trends — คำอังกฤษ Text to Speech เทียบ Tools อื่น](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=jpg%20to%20png,barcode%20generator,text%20to%20speech,countdown%20timer,photo%20collage)

## รอบที่ 12 — Barcode Generator เทียบ Grade Calculator

สำรวจต่อเมื่อ 3 สิงหาคม 2026 โดยใช้หลักฐาน Google Trends ประเทศไทยช่วง 12 เดือนจากรอบที่ 11 ซึ่ง `สร้างบาร์โค้ด` และ `คำนวณเกรด` มีค่าเฉลี่ยเท่ากันที่ 37 ในชุดเปรียบเทียบเดียวกัน จึงไม่ใช้ตัวเลขนี้ตัดสินเพียงอย่างเดียว และเจาะคำแนะนำการค้นหาปัจจุบันจาก Google Autocomplete เพิ่ม:

| คำตั้งต้น | ตัวอย่างคำแนะนำที่พบ |
|---|---|
| สร้างบาร์โค้ด | สร้างบาร์โค้ดฟรี, 13 หลัก, Excel, สินค้า, ออนไลน์, Code 128, 14 หลัก |
| barcode generator | free, EAN-13, vector, SVG, online, Code 128, ITF-14, Excel |
| คำนวณเกรด | เกรดเฉลี่ย, มหาลัย, 5 เทอม, GPAX, เกรดเฉลี่ยสะสม |
| คำนวณเกรดเฉลี่ย | สะสม, มหาลัย, รวม, 2/4/5/6 เทอม, GPAX |

ทั้งสองกลุ่มมี intent จริง แต่ Barcode ครอบคลุมหลายสายงานกว่า ทั้งร้านค้า คลังสินค้า โลจิสติกส์ งานพิมพ์ และนักพัฒนา และมี action ที่ทำฟรีใน Browser ได้ครบกว่า จึงส่งมอบ `Barcode Generator` ก่อน แล้วเก็บ Grade Calculator เป็นผู้สมัคร Batch 23 ขอบเขตรองรับ Code 128, EAN-13, EAN-8, UPC-A, ITF-14 และ Code 39 วางหนึ่งคอลัมน์จาก Excel ได้สูงสุด 50 รายการ เติมหรือตรวจ Check Digit และดาวน์โหลด PNG/SVG/ZIP

ใช้ `jsbarcode` 3.12.3 แบบ dynamic import เฉพาะเมื่อกดสร้าง ไม่มี CDN ภายนอก และใช้ `fflate` เฉพาะเมื่อดาวน์โหลด ZIP หน้าเครื่องมือแยกชัดเจนว่าการสร้างภาพ EAN/UPC ไม่ได้จดทะเบียน GTIN: สินค้าจริงต้องใช้เลขหมายตามกระบวนการ GS1 และควรสแกนทดสอบบนงานพิมพ์จริง Google Trends และ Autocomplete เป็นสัญญาณความสนใจ/intent ไม่ใช่จำนวนค้นหารายเดือน จึงต้องยืนยันผลหลังเปิดตัวด้วย Search Console

- [Google Trends — Text to Speech เทียบ Barcode, Grade และ JPG to PNG](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%20jpg%20%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20png,%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B9%80%E0%B8%81%E0%B8%A3%E0%B8%94,%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B8%84%E0%B8%B4%E0%B8%94%E0%B9%80%E0%B8%A5%E0%B8%82%E0%B8%84%E0%B9%88%E0%B8%B2%E0%B9%84%E0%B8%9F,%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%9A%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B9%82%E0%B8%84%E0%B9%89%E0%B8%94,%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B9%80%E0%B8%AA%E0%B8%B5%E0%B8%A2%E0%B8%87)
- [Google Autocomplete — สร้างบาร์โค้ด](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%9A%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B9%82%E0%B8%84%E0%B9%89%E0%B8%94)
- [Google Autocomplete — Barcode Generator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=barcode%20generator)
- [Google Autocomplete — คำนวณเกรด](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B9%80%E0%B8%81%E0%B8%A3%E0%B8%94)
- [JsBarcode — รูปแบบและ API ที่รองรับ](https://github.com/lindell/JsBarcode)
- [GS1 Thailand — สมัครและจัดการเลขหมาย GTIN](https://gs1th.org/get-a-barcode/)

## รอบที่ 13 — Grade Calculator และ intent นักเรียน/นักศึกษา

สำรวจต่อเมื่อ 3 สิงหาคม 2026 จากหลักฐาน Trends ชุดเดียวกับรอบ 11–12 ซึ่ง `คำนวณเกรด` มีค่าเฉลี่ย 37 และตรวจ Google Autocomplete ปัจจุบันซ้ำเพื่อแยกงานจริง:

| คำตั้งต้น | คำแนะนำหลักที่พบ |
|---|---|
| คำนวณเกรด | เกรดเฉลี่ย, มหาลัย, 5 เทอม, GPAX, เกรดเฉลี่ยสะสม, 4 เทอม, เกรดรวม |
| คำนวณเกรดเฉลี่ย | สะสม, มหาลัย, รวม, 2/4/5/6 เทอม, GPAX |
| คำนวณ GPA | GPAX, มหาลัย, รายวิชา, 4/5/6 เทอม, รวม |
| เครื่องคิดเลขค่าไฟ | ไม่มีคำแนะนำในรอบนี้ |
| คำนวณโอที | 1.5 เท่า, รายวัน, วันหยุด, วันอาทิตย์, 2/3 เท่า, Excel |
| csv to excel | converter, online, free, file, columns |

Grade Calculator จึงมี intent ทั้งระดับรายวิชาและหลายภาคเรียนที่ทำฟรีใน Browser ได้ครบโดยไม่อาศัยข้อมูลกฎหมายหรือ API ภายนอก ส่วน Overtime มี long-tail จริงแต่ต้องตรวจฐานกฎหมายและประเภทการจ้างปัจจุบันก่อนจึงเลื่อนไปวิจัย Batch 24 ขณะที่ CSV to Excel เป็นผู้สมัคร low-risk อีกตัวที่ต้องเทียบ Trends ภาษาอังกฤษเพิ่ม

ขอบเขตที่ส่งมอบมีสองโหมด: (1) GPA รายภาคจากหน่วยกิต × แต้ม A, B+, B, C+, C, D+, D, F โดย F นับแต้ม 0 และ W/S/U ไม่นับ และ (2) ประมาณ GPAX จาก GPA กับหน่วยกิตของ 2–20 ภาคเรียนแบบถ่วงน้ำหนัก ไม่ใช้ค่าเฉลี่ยธรรมดา คู่มือมหาวิทยาลัยแม่ฟ้าหลวงยืนยันสูตรคะแนนรวม ÷ หน่วยกิตรวมและตัวอย่าง 45 ÷ 19 = 2.36 ในเอกสาร รวมทั้งแสดง W/S/U ว่าไม่นำมาคำนวณ เครื่องมือแสดงค่าละเอียด ค่าปัด 2 ตำแหน่ง และค่าตัด 2 ตำแหน่งควบคู่กัน เพราะข้อกำหนดการแสดงผลอาจต่างกัน และระบุว่า GPAX จาก GPA รายเทอมเป็นเพียงค่าประมาณหากค่าต้นทางถูกปัดมาแล้ว

Google Trends เป็นข้อมูลความสนใจสัมพัทธ์ที่ถูก normalize ไม่ใช่จำนวนค้นหารายเดือน จึงต้องติดตาม impressions, queries และ CTR จริงหลังเปิดตัวผ่าน Search Console ก่อนสรุปผลเชิงรายได้

- [Google Autocomplete — คำนวณเกรด](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B9%80%E0%B8%81%E0%B8%A3%E0%B8%94)
- [Google Autocomplete — คำนวณเกรดเฉลี่ย](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B9%80%E0%B8%81%E0%B8%A3%E0%B8%94%E0%B9%80%E0%B8%89%E0%B8%A5%E0%B8%B5%E0%B9%88%E0%B8%A2)
- [Google Autocomplete — คำนวณ GPA](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%20GPA)
- [Google Trends — ชุดเปรียบเทียบเครื่องมือสำนักงานประเทศไทย](https://trends.google.com/trends/explore?date=today%2012-m&geo=TH&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%20jpg%20%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20png,%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B9%80%E0%B8%81%E0%B8%A3%E0%B8%94,%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B8%84%E0%B8%B4%E0%B8%94%E0%B9%80%E0%B8%A5%E0%B8%82%E0%B8%84%E0%B9%88%E0%B8%B2%E0%B9%84%E0%B8%9F,%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%9A%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B9%82%E0%B8%84%E0%B9%89%E0%B8%94,%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B9%80%E0%B8%AA%E0%B8%B5%E0%B8%A2%E0%B8%87)
- [มหาวิทยาลัยแม่ฟ้าหลวง — วิธีคำนวณ GPA และ GPAX](https://reg.mfu.ac.th/backend/api/files/media_library/CAL_2022-09-07%2013%3A40%3A41.809577.pdf)
- [Google Trends Help — ข้อมูล Trends เป็นค่าความสนใจสัมพัทธ์](https://support.google.com/trends/answer/4365533?hl=en)

## รอบที่ 14 — CSV to Excel และ intent งานสำนักงานหลายสาย

สำรวจต่อเมื่อ 3 สิงหาคม 2026 โดยตรวจ Google Autocomplete ปัจจุบันของผู้สมัคร Batch 24 และพยายามเปิด Google Trends Explore ชุดเปรียบเทียบประเทศไทย 12 เดือน แต่ได้รับ HTTP 429 จึงไม่สร้างหรืออ้างตัวเลข Trends ใหม่จากรอบนี้ การตัดสินใจใช้ intent เชิงคุณภาพจาก Autocomplete ร่วมกับความกว้างของกลุ่มผู้ใช้ ความเสี่ยงข้อมูล และความสามารถในการทำงานจริงใน Browser:

| คำตั้งต้น | คำแนะนำหลักที่พบ |
|---|---|
| csv to excel | converter, online, converter online, free, table, convert, file, columns |
| convert csv to excel | online, online free, free, Power Automate, table, columns, automatically, Python, Mac |
| csv cleaner | online, tool, AI, Python, data cleaner, duplicate cleaner |
| คำนวณ OT / คำนวณโอที | 1.5 เท่า, ฐานเงินเดือน, รายวัน, ออนไลน์, วันหยุด, 2/3 เท่า, Excel |
| คำนวณวันทำงาน / นับวันทำงาน | ราชการ, ออนไลน์, Excel, 119 วัน |
| คำนวณเกรดที่ต้องได้ / วางแผนเกรด | ไม่พบคำแนะนำในรอบนี้; `target gpa calculator` มีคำแนะนำภาษาอังกฤษแต่เน้นชื่อสถาบันต่างประเทศ |

CSV to Excel จึงชนะผู้สมัคร low-risk ในรอบนี้เพราะมี action ชัดเจนและใช้ได้กับสำนักงาน บัญชี ฝ่ายขาย โลจิสติกส์ นักวิเคราะห์ และนักพัฒนา ส่วน OT มี long-tail ภาษาไทยแข็งแรงกว่าแต่ต้องแยกประเภทลูกจ้าง วันทำงาน วันหยุด และตรวจฐานกฎหมายล่าสุดก่อนพัฒนา Workday มี intent จริงแต่แคบกว่า และ Target GPA ภาษาไทยยังไม่เห็นสัญญาณแยกจาก Grade Calculator เดิมเพียงพอ

ขอบเขตที่ส่งมอบคืออ่านไฟล์ CSV/TSV/TXT หรือข้อความที่วาง รองรับ comma/tab/semicolon/pipe, UTF-8 และ Windows-874, quoted fields, escaped quote และ multiline field ตรวจ Preview/แถวผิดรูปใน Web Worker แล้วสร้าง .xlsx หนึ่ง Worksheet พร้อมหัวตาราง Filter และ freeze row ตัวเลขที่ปลอดภัยถูกเขียนเป็นเซลล์ตัวเลข แต่รหัสที่มีเลขศูนย์นำหน้าและค่าที่อาจเป็น Formula Injection ถูกเก็บเป็น inline string ไม่สร้างสูตรจาก input จำกัด 10 MB, 50,000 แถว, 200 คอลัมน์ และ 500,000 เซลล์เพื่อคุม RAM และเวลาบนอุปกรณ์พกพา

Microsoft ระบุว่าไฟล์ข้อความแบบ delimited ใช้ tab ได้และ CSV ใช้ comma โดยตัวคั่นสามารถเปลี่ยนได้ อีกทั้ง Excel รองรับสูงสุด 1,048,576 แถว × 16,384 คอลัมน์ แต่เครื่องมือ Browser ใช้เพดานต่ำกว่ามากเพื่อความเสถียร RFC 4180 ใช้เป็นฐานสำหรับ comma, quote, quote ซ้อน และ newline ใน quoted field ส่วนคะแนน Trends ต้องตีความเป็นค่าความสนใจสัมพัทธ์ ไม่ใช่จำนวนค้นหารายเดือน

- [Google Autocomplete — csv to excel](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=csv%20to%20excel)
- [Google Autocomplete — convert csv to excel](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=convert%20csv%20to%20excel)
- [Google Autocomplete — คำนวณ OT](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%20ot)
- [Google Autocomplete — คำนวณวันทำงาน](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B8%A7%E0%B8%B1%E0%B8%99%E0%B8%97%E0%B8%B3%E0%B8%87%E0%B8%B2%E0%B8%99)
- [RFC 4180 — Common Format and MIME Type for CSV](https://www.rfc-editor.org/info/rfc4180/)

- [Microsoft — Import or export text and CSV files](https://support.microsoft.com/en-us/excel/get-started/import-or-export-text-txt-or-csv-files)
- [Microsoft — Excel specifications and limits](https://support.microsoft.com/en-us/excel/excel-specifications-and-limits)
- [Google Trends Help — ข้อมูล Trends เป็นค่าความสนใจสัมพัทธ์](https://support.google.com/trends/answer/4365533?hl=en)

## รอบที่ 15 — UTM Builder และเครื่องมือข้ามสายงาน

สำรวจต่อเมื่อ 8 สิงหาคม 2026 โดยตรวจ Google Autocomplete ปัจจุบัน 16 คำตั้งต้น แล้วคัด 12 แนวคิดที่ไม่ซ้ำ catalog มากเกินไป Google Trends Explore ชุดประเทศไทย 12 เดือนตอบ HTTP 429 อีกครั้ง จึงไม่อ้างตัวเลข Trends ใหม่และไม่ตีความจำนวนคำแนะนำเป็น search volume; ใช้ Autocomplete เป็นหลักฐานว่ามี long-tail intent เท่านั้น แล้วจัดอันดับร่วมกับความกว้างของผู้ใช้ ความเสี่ยง ความสามารถในการทำงานฟรีใน Browser โอกาส SEO/AdSense และการขยายผลิตภัณฑ์

คะแนน 5 คือสูงที่สุด ส่วน Demand แสดงจำนวนคำแนะนำสูงสุด 10 รายการจาก endpoint ที่ตรวจในรอบนี้:

| อันดับ | แนวคิด | Autocomplete | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | UTM Link Builder | 10 | 2 | 5 | 5 | 5 | 3 | ชนะ: เปิดกลุ่มนักการตลาด/เจ้าของร้าน มีข้อกำหนด GA4 ทางการ และ client-only ได้ครบ |
| 2 | CSV Cleaner + Duplicate Finder | 8 | 3 | 5 | 4 | 5 | 3 | คุณค่าสูงและ reuse CSV parser ได้ แต่ต่อจาก Batch 24 จะกระจุกในกลุ่มข้อมูลเกินไป |
| 3 | JSON to CSV Converter | 10 | 2 | 4 | 4 | 5 | 2 | intent กว้าง แต่ทับกับ JSON/CSV tools เดิมและต้องออกแบบ nested data ให้โปร่งใส |
| 4 | Markdown Table Generator | 10 | 2 | 4 | 4 | 4 | 2 | feasible และเหมาะ developer/content แต่กลุ่มผู้ใช้แคบกว่า UTM |
| 5 | Excel to CSV Converter | 10 | 3 | 4 | 4 | 5 | 2 | มี intent ชัด แต่ต้องเพิ่ม parser XLSX และนโยบายหลาย Worksheet |
| 6 | Overtime Calculator | 10 | 4 | 5 | 5 | 4 | 3 | long-tail ไทยแข็งแรง แต่ต้อง version กฎหมายและแยกประเภทลูกจ้าง/วันทำงานก่อน |
| 7 | Business Days Calculator | 10 | 3 | 4 | 4 | 4 | 3 | intent อังกฤษกว้างแต่คำแนะนำผูกประเทศ ต้องมีชุดวันหยุดไทยแบบ versioned |
| 8 | Online Signature Maker | 10 | 3 | 4 | 4 | 4 | 3 | demand กว้าง แต่ทับกับ Sign PDF และต้องสื่อว่าไม่ใช่ digital certificate |
| 9 | Invoice Number Generator | 10 | 2 | 3 | 4 | 3 | 2 | ทำง่ายแต่เลขที่เอกสารควรผูกระบบบัญชี/ลำดับจริง ไม่ควรสุ่มโดยไม่มีบริบท |
| 10 | CSV Duplicate Remover | 7 | 2 | 4 | 4 | 4 | 2 | intent เฉพาะดี แต่ควรรวมใน CSV Cleaner แทนการแยกหน้าบางเกินไป |
| 11 | Remove Duplicate Rows Online | 3 | 2 | 3 | 3 | 3 | 2 | intent แคบและซ้ำ Text Cleaner/CSV Cleaner |
| 12 | Excel Duplicate Remover Online | 1 | 3 | 3 | 3 | 3 | 2 | สัญญาณอ่อนสุดในชุดและต้องเพิ่ม XLSX parser |

UTM Link Builder จึงถูกเลือกเพื่อเพิ่มเครื่องมือสายการตลาดโดยไม่เพิ่ม backend หรือค่า API เครื่องมือบังคับ `utm_source`, `utm_medium`, `utm_campaign`, รองรับ `utm_id`, `utm_source_platform`, `utm_term`, `utm_content`, รักษา query/hash เดิม แทน UTM เดิมโดยไม่สร้างค่าซ้ำ นำ URL ที่ติด UTM กลับมาแก้ไขได้ และเปิด lowercase/underscore เป็นค่าเริ่มต้นเพื่อลดข้อมูลแตกแถว

Google Analytics ระบุว่าค่า UTM แยกตัวพิมพ์เล็ก-ใหญ่ แนะนำ naming convention ที่สม่ำเสมอ และควรใช้ source/medium/campaign ให้ครบ ขณะเดียวกันการใส่ manual campaign values ร่วมกับ Google Click ID อาจทำให้ attribution ผิด จึงต้องแสดงคำเตือน Google Ads auto-tagging อย่างชัดเจนแทนการบอกให้ติด UTM ทุกลิงก์

- [Google Autocomplete — utm builder](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=utm%20builder)
- [Google Autocomplete — utm link builder](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=utm%20link%20builder)
- [Google Autocomplete — csv cleaner](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=csv%20cleaner)
- [Google Autocomplete — json to csv converter](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=json%20to%20csv%20converter)
- [Google Autocomplete — markdown table generator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=markdown%20table%20generator)
- [Google Analytics Help — Collect campaign data with custom URLs](https://support.google.com/analytics/answer/10917952?hl=en)
- [Google Campaign URL Builder](https://ga-dev-tools.google/campaign-url-builder/)
- [Google Analytics Help — Traffic-source dimension scopes and GCLID caution](https://support.google.com/analytics/answer/11080067?hl=en)

## รอบที่ 16 — CSV Cleaner และ Duplicate Finder

พัฒนาต่อเมื่อ 8 สิงหาคม 2026 จากผู้สมัครอันดับ 2 ของรอบที่ 15 โดยใช้หลักฐาน Google Autocomplete วันเดียวกัน: `csv cleaner` มีคำแนะนำ 8 รายการ เช่น online, tool, AI, Python, data cleaner และ duplicate cleaner ส่วน `csv duplicate remover` มี 7 รายการ ขณะที่ `remove duplicate rows online` มี 3 รายการ จึงรวม intent เหล่านี้เป็นหน้าเดียวแทนสร้างหน้าบางหลายหน้า

ขอบเขตถูกออกแบบให้ใช้ได้กับฝ่ายขาย การตลาด บัญชี ร้านค้า นักวิเคราะห์ และนักพัฒนา: รับ CSV/TSV/TXT หรือข้อความ, UTF-8/Windows-874, ตรวจตัวคั่นอัตโนมัติ, ตัดช่องว่างหัวท้าย, ลบแถวว่าง, เลือกหนึ่งหรือหลายคอลัมน์สำหรับตรวจซ้ำ, เทียบแบบแยกหรือไม่แยกตัวพิมพ์เล็ก-ใหญ่, ข้ามคีย์ว่าง, เลือกเก็บแถวแรกหรือแถวสุดท้าย และใช้โหมดค้นหาอย่างเดียวโดยไม่ลบได้ งาน parse/clean/serialize ทำใน Web Worker ภายใต้เพดานเดิม 10 MB, 50,000 แถว, 200 คอลัมน์ และ 500,000 เซลล์

ด้านความปลอดภัย OWASP ระบุว่า Spreadsheet อาจตีความเซลล์ที่ขึ้นต้นด้วย `=`, `+`, `-` หรือ `@` เป็นสูตร และไม่มีวิธี sanitize แบบเดียวที่ปลอดภัยกับทุกโปรแกรมและทุก downstream workflow เครื่องมือจึงเปิดการเติม Tab หน้าเซลล์เสี่ยงเป็นค่าเริ่มต้นสำหรับไฟล์ที่คนเปิดใน Spreadsheet แต่แสดงจำนวนเซลล์ที่เปลี่ยนและให้ปิดได้เมื่อระบบนำเข้าต้องรักษาข้อมูลเดิม ผู้ใช้ต้องยอมรับ trade-off อย่างชัดเจน ผลลัพธ์ quote ทุกเซลล์, escape quote ซ้อน, ใช้ CRLF และ UTF-8 BOM ตามโครงสร้าง CSV ที่สอดคล้องกับ RFC 4180

- [Google Autocomplete — csv cleaner](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=csv%20cleaner)
- [Google Autocomplete — csv duplicate remover](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=csv%20duplicate%20remover)
- [Google Autocomplete — remove duplicate rows online](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&q=remove%20duplicate%20rows%20online)
- [OWASP — CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection)
- [OWASP WSTG — Testing for CSV Injection](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/21-Testing_for_CSV_Injection)
- [RFC 4180 — Common Format and MIME Type for CSV](https://www.rfc-editor.org/info/rfc4180/)

## รอบที่ 17 — VAT Calculator Thailand และการจัดอันดับ Batch 27

สำรวจต่อเมื่อ 8 สิงหาคม 2569 โดยตรวจ Google Autocomplete ด้วย locale ไทยสำหรับคำตั้งต้นภาษาอังกฤษ 22 คำและภาษาไทย 20 คำ แล้วคัดแนวคิดที่ไม่ซ้ำ catalog มากเกินไป Google อธิบายว่า Autocomplete มาจากการค้นหาจริงและสะท้อนคำที่พบบ่อยหรือกำลังเป็นกระแสตามบริบท แต่ไม่ควรตีความจำนวนคำแนะนำเป็น search volume ส่วน Google Trends เป็นค่าความสนใจสัมพัทธ์และไม่ใช่ผลสำรวจ จึงใช้จำนวนคำแนะนำเพียงเป็นหลักฐานความกว้างของ long-tail intent ร่วมกับคุณค่าผู้ใช้ ความเสี่ยง ความสามารถทำฟรีใน Browser และโอกาสสร้างหน้าคุณภาพ

คะแนน 5 คือสูงที่สุด คอลัมน์ TH/EN คือจำนวนคำแนะนำสูงสุด 10 รายการจาก endpoint ที่ตรวจในรอบนี้ ไม่ใช่จำนวนค้นหารายเดือน:

| อันดับ | แนวคิด | TH/EN | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | VAT Calculator Thailand | 10/10 | 3 | 5 | 5 | 4 | 3 | ชนะ: intent ไทยชัดทั้ง VAT 7, ย้อนกลับ, Service Charge และ Excel; มีสูตรกับอัตราปัจจุบันจากกรมสรรพากร |
| 2 | Markdown Table Generator | 9/10 | 2 | 4 | 4 | 4 | 2 | demand กว้างและ client-only แต่กลุ่ม developer/content แคบกว่า VAT |
| 3 | Excel to CSV Converter | 10/10 | 3 | 5 | 4 | 5 | 2 | ใช้จริงสูง แต่ต่อจาก CSV สอง Batch จะทำ catalog กระจุกงานข้อมูล |
| 4 | HTML Table Generator | 8/10 | 3 | 4 | 4 | 4 | 3 | long-tail ไทยดีและต่อยอด Markdown ได้ แต่ควรออกแบบ accessibility/colspan ให้ครบ |
| 5 | Overtime Calculator Thailand | 10/10 | 4 | 5 | 5 | 4 | 3 | intent ไทยแข็งแรงมาก แต่ต้องแยกประเภทลูกจ้าง วันทำงาน วันหยุด และ version กฎหมายแรงงาน |
| 6 | Resume Builder | 10/10 | 5 | 5 | 5 | 5 | 4 | มูลค่าสูง แต่ต้องมี template, PDF, ATS semantics และความเป็นส่วนตัวก่อนเปิดตัว |
| 7 | Word Cloud Generator | 3/10 | 4 | 4 | 4 | 4 | 4 | เหมาะการศึกษา/คอนเทนต์ แต่ต้องตัดคำไทย ฟอนต์ และ export ภาพให้เชื่อถือได้ |
| 8 | Image Cropper | 1/10 | 3 | 5 | 5 | 5 | 2 | intent อังกฤษกว้าง มีงานวงกลม/พิกเซล/ขนาดจริง แต่สัญญาณคำไทยรอบนี้แคบ |
| 9 | Favicon / PWA Icon Generator | 2/10 | 3 | 4 | 4 | 4 | 3 | ทำฟรีได้และช่วย developer/ร้านค้า แต่ต้อง export หลายขนาดและ manifest อย่างถูกต้อง |
| 10 | Remove Image Metadata | 1/10 | 4 | 4 | 4 | 4 | 4 | privacy value สูง แต่ต้องพิสูจน์ชนิด metadata ที่ลบได้จริงในแต่ละ format |
| 11 | Password Strength Checker | 0/10 | 2 | 4 | 4 | 4 | 3 | อังกฤษกว้างแต่ไทยไม่แตกคำ; ต้องไม่ส่งรหัสผ่านและไม่อ้างเวลาถอดรหัสเกินหลักฐาน |
| 12 | Business Days Calculator | 4/10 | 3 | 4 | 4 | 4 | 3 | มี intent ออนไลน์/Excel แต่ต้องมีชุดวันหยุดไทย versioned และแยกวันหยุดองค์กร |
| 13 | JSON ↔ CSV Converter | 1/10 | 3 | 4 | 4 | 5 | 2 | intent อังกฤษ 10/10 ทั้งสองทิศทาง แต่ซ้ำกลุ่ม JSON/CSV เดิมและต้องเปิดเผยการ flatten nested data |
| 14 | Online Signature Maker | 2/10 | 3 | 4 | 4 | 4 | 3 | demand อังกฤษกว้าง แต่ทับกับ Sign PDF และต้องย้ำว่าไม่ใช่ digital certificate |
| 15 | Thai Number to Words | 4/1 | 2 | 4 | 3 | 4 | 3 | งานบัญชีใช้ง่าย แต่ intent ต่ำกว่ากลุ่มบนและมี logic บาทถ้วนอยู่ใน Quotation แล้ว |

VAT Calculator ถูกเลือกเพราะเพิ่มเครื่องมือสายธุรกิจ/บัญชีที่ใช้ได้กับร้านค้า ฟรีแลนซ์ พนักงานจัดซื้อ ฝ่ายขาย และผู้บริโภค โดยไม่ต้องเก็บข้อมูลหรือเรียก API ขอบเขตมีสองโหมด: บวก VAT จากราคาก่อนภาษี และถอด VAT จากราคารวมด้วยสูตร `ราคารวม × อัตรา / (100 + อัตรา)` รองรับ Service Charge ก่อน VAT และภาษีหัก ณ ที่จ่ายแบบปิดเป็นค่าเริ่มต้น อัตราทุกส่วนแก้ไขได้ ผลลัพธ์แสดงฐาน VAT ภาษี ยอดรวม ยอดหัก และยอดจ่ายสุทธิ พร้อมสูตรและนโยบายปัดแต่ละองค์ประกอบสองตำแหน่ง

กรมสรรพากรยืนยันเมื่อ 2 สิงหาคม 2569 ว่าการขายสินค้าและบริการทั่วไปยังใช้อัตรา VAT 7% และการขยายปัจจุบันถึง 30 กันยายน 2570 แต่มีสินค้า บริการ และกิจการที่ยกเว้น เครื่องมือจึงเก็บ preset พร้อมวันที่ตรวจสอบ/วันสิ้นสุดประกาศ ไม่อ้างว่า 7% ใช้กับทุกกรณี และไม่สร้างใบกำกับภาษี คู่มือกรมสรรพากรระบุสูตรภาษีขายเป็นมูลค่าสินค้าหรือบริการ × อัตราภาษี และกรณี VAT รวมอยู่ในราคายกตัวอย่างสูตร 7/107 ส่วนภาษีหัก ณ ที่จ่ายมีหลายอัตราตามประเภทเงินได้ ผู้จ่าย และผู้รับ จึงต้องแยกจาก VAT อย่างชัดเจนและให้ผู้ใช้เลือกเอง

- [Google Autocomplete — คำนวณ VAT](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%20vat)
- [Google Autocomplete — Markdown Table Generator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=markdown%20table%20generator)
- [Google Autocomplete — แปลง Excel เป็น CSV](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%20excel%20%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20csv)
- [Google Autocomplete — คำนวณโอที](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B9%82%E0%B8%AD%E0%B8%97%E0%B8%B5)
- [Google Trends Help — Trends และ Autocomplete ต้องตีความอย่างไร](https://support.google.com/trends/answer/4365533?hl=en)
- [กรมสรรพากร — ยืนยัน VAT 7% เมื่อ 2 สิงหาคม 2569](https://rd.go.th/fileadmin/user_upload/news/2569thai/news19_2569.pdf)
- [กรมสรรพากร — ขยาย VAT 7% ถึง 30 กันยายน 2570](https://rd.go.th/fileadmin/user_upload/news/2569thai/news18_2569.pdf)
- [กรมสรรพากร — คู่มือภาษีมูลค่าเพิ่มสำหรับ SMEs](https://www.rd.go.th/fileadmin/user_upload/SMEs/infographic/SME_lv3_1.pdf)
- [กรมสรรพากร — สูตร 7/107 เมื่อ VAT รวมในราคา](https://www.rd.go.th/fileadmin/user_upload/SMEs/infographic/info-e-business-63.pdf)
- [กรมสรรพากร — คู่มือภาษีหัก ณ ที่จ่ายและหลายอัตรา](https://interweb1.rd.go.th/publish/seminar/training/RD06.pdf)

## รอบที่ 18 — Markdown Table Generator และการจัดอันดับ Batch 28

สำรวจต่อเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย โดยเทียบคำตั้งต้นภาษาอังกฤษและภาษาไทยของผู้สมัครเดิมกับ long-tail เฉพาะงาน ตารางด้านล่างใช้จำนวนคำแนะนำสูงสุด 10 รายการเป็นสัญญาณความกว้างของ intent เท่านั้น ไม่ใช่ search volume รายเดือน การรับประกันอันดับหน้าแรกทำไม่ได้ จึงให้คะแนนร่วมกับประโยชน์จริง ความสามารถทำฟรีใน Browser, catalog overlap, ความเสี่ยง และคุณภาพหน้าที่ทำได้ครบ

คะแนน 5 คือสูงที่สุด คอลัมน์ TH/EN เป็นจำนวนคำแนะนำสูงสุดจาก endpoint ที่ตรวจในรอบนี้:

| อันดับ | แนวคิด | TH/EN | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | Markdown Table Generator | 9/10 | 2 | 4 | 4 | 4 | 3 | ชนะ: generator, formatter และ editor มี intent อังกฤษกว้าง; ทำ visual editor และ import Excel/CSV ได้โดยไม่ใช้ Server |
| 2 | Excel to CSV Converter | 10/10 | 3 | 5 | 4 | 5 | 2 | demand ไทยและอังกฤษแข็งแรง แต่จะเป็น Batch สาย CSV ลำดับที่สามติดกันหากเลือกทันที |
| 3 | HTML Table Generator | 8/10 | 3 | 4 | 4 | 4 | 3 | intent ดีและต่อยอดข้อมูลตารางได้ แต่ scope ที่ดีต้องรองรับ caption, scope, colspan/rowspan และ CSS accessibility |
| 4 | Resume Builder | 10/10 | 5 | 5 | 5 | 5 | 4 | มูลค่าสูง แต่ต้องมี ATS semantics, template, PDF, privacy และไม่ล็อก download หลัง login |
| 5 | Image Cropper | 1/10 | 3 | 5 | 5 | 5 | 3 | อังกฤษ 10/10 พร้อม circle, pixel, cm/mm และ quality; ไทยยังแคบ |
| 6 | Word Cloud Generator | 3/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10; ภาษาไทยต้องพิสูจน์ tokenization, ฟอนต์ และ export ภาพ |
| 7 | Favicon / PWA Icon Generator | 2/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ต้องสร้าง ICO/PNG หลายขนาดและ manifest ที่ถูกต้อง |
| 8 | Business Days Calculator | 4/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10 แต่ long-tail ผูกประเทศ; วันหยุดไทยและองค์กรต้อง version แยก |
| 9 | JSON to CSV Converter | 1/10 | 3 | 4 | 4 | 5 | 2 | อังกฤษ 10/10 แต่ทับ catalog JSON/CSV และต้องอธิบาย flatten nested object อย่างโปร่งใส |
| 10 | Remove Image Metadata | 1/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10 และมี privacy value; ต้องตรวจ metadata ทุก format หลัง re-encode จริง |
| 11 | Password Strength Checker | 0/10 | 2 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ต้อง client-only และไม่อ้างเวลาถอดรหัสจากสมมติฐานที่ตรวจไม่ได้ |
| 12 | Online Signature Maker | 2/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10 แต่ทับ Sign PDF และต้องแยกภาพลายเซ็นจาก digital certificate |
| 13 | Invoice Generator | 1/10 | 5 | 5 | 5 | 5 | 3 | อังกฤษ 10/10; เอกสารภาษีไทยและเลขที่เอกสารทำให้ scope เสี่ยงกว่า Quotation เดิม |
| 14 | Lorem Ipsum Generator | 1/10 | 2 | 3 | 3 | 3 | 2 | อังกฤษ 10/10แต่ utility value และ differentiation ต่ำกว่า visual table editor |
| 15 | Thai Number to Words | 4/1 | 2 | 4 | 3 | 4 | 3 | ใช้จริงในบัญชีแต่ intent ต่ำกว่า และ logic บาทถ้วนมีใน Quotation เดิมแล้ว |

Markdown Table Generator ถูกเลือกเพราะเพิ่มเครื่องมือสาย developer, documentation, data analyst และ content โดยไม่สร้าง Batch CSV ลำดับที่สามติดกัน ขอบเขตประกอบด้วย visual cell editor, เพิ่ม/ลบแถวและคอลัมน์, alignment รายคอลัมน์, import ข้อมูลจาก Excel/Google Sheets แบบ Tab และ CSV/Semicolon/Pipe ที่มี quote, Preview แบบ semantic table, คัดลอก และดาวน์โหลด `.md` ทุกอย่างทำใน Browser

ตาม GitHub Flavored Markdown ตารางต้องมี header row และ delimiter row, ใช้ Colon ที่ด้านซ้าย/ขวาของ Hyphen เพื่อกำหนด alignment และ Pipe ใน cell ต้อง escape ด้วย Backslash เครื่องมือจึงสร้างหัวว่างเป็น `คอลัมน์ N`, escape Backslash ก่อน Pipe, แปลง line break เป็น `<br>` และแจ้งว่า GFM ไม่รองรับ merged cells/colspan/rowspan รวมถึง renderer บางตัวอาจไม่รองรับ table extension หรือ raw HTML เหมือน GitHub จำกัด 100 แถว, 20 คอลัมน์, 1,000 ตัวอักษรต่อ cell และข้อความนำเข้า 100,000 ตัวอักษรเพื่อไม่ให้ editor input จำนวนมากทำให้ Browser ค้าง

- [Google Autocomplete — Markdown Table Generator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=markdown%20table%20generator)
- [Google Autocomplete — Markdown Table Formatter](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=markdown%20table%20formatter)
- [Google Autocomplete — Markdown Table Editor](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=markdown%20table%20editor)
- [Google Autocomplete — สร้างตาราง Markdown](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%95%E0%B8%B2%E0%B8%A3%E0%B8%B2%E0%B8%87%20markdown)
- [Google Autocomplete — แปลง Excel เป็น CSV](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%20excel%20%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20csv)
- [Google Autocomplete — HTML Table Generator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=html%20table%20generator)
- [GitHub Docs — Organizing information with tables](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-tables)
- [GitHub Flavored Markdown Spec — Tables extension](https://github.github.com/gfm/#tables-extension-)

## รอบที่ 19 — Excel to CSV Converter และการจัดอันดับ Batch 29

สำรวจต่อเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทยและตรวจหน้าคู่แข่งที่ติดผลค้นหาสำหรับ intent การแปลงตาราง จำนวนคำแนะนำสูงสุด 10 รายการเป็นเพียงสัญญาณว่ามี long-tail intent ไม่ใช่ search volume และไม่สามารถรับประกันอันดับหน้าแรก Google ได้ การเลือกจึงรวมประโยชน์จริง ความครบของหน้าที่ทำได้ฟรีใน Browser, catalog overlap, ความเสี่ยง ความเป็นส่วนตัว และโอกาสสร้างเนื้อหาที่ตอบโจทย์กว่าหน้าแปลงไฟล์แบบบาง

คะแนน 5 คือสูงที่สุด คอลัมน์ TH/EN เป็นจำนวนคำแนะนำสูงสุดจาก endpoint ที่ตรวจในรอบนี้:

| อันดับ | แนวคิด | TH/EN | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | Excel to CSV Converter | 10/10 | 3 | 5 | 4 | 5 | 3 | ชนะ: intent ไทย/อังกฤษชัด ทำ multi-sheet, Preview, BOM และ privacy-first ได้จริงใน Browser |
| 2 | HTML Table Generator | 8/10 | 3 | 4 | 4 | 4 | 3 | demand ดี แต่ควรทำ semantics, caption, scope, responsive preview และ CSS export ให้ครบ |
| 3 | Resume Builder | 10/10 | 5 | 5 | 5 | 5 | 4 | มูลค่าสูง แต่ต้องพิสูจน์ ATS semantics, PDF ภาษาไทย, privacy และหลาย template |
| 4 | Image Cropper | 1/10 | 3 | 5 | 5 | 5 | 3 | อังกฤษ 10/10; ควรรองรับ pixel, ratio, circle, rotate และ quality โดยไม่เสีย metadata policy |
| 5 | Favicon / PWA Icon Generator | 2/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ต้องสร้าง ICO/PNG/manifest หลายขนาดและตรวจไฟล์ผลจริง |
| 6 | Word Cloud Generator | 3/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10; ภาษาไทยต้องมี tokenization และฟอนต์ที่ export ได้ถูกต้อง |
| 7 | Remove Image Metadata | 1/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10 และมี privacy value แต่ต้องตรวจ EXIF/XMP/IPTC หลัง re-encode ทุก format |
| 8 | Business Days Calculator | 4/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; วันหยุดไทย/ประเทศ/องค์กรต้องเป็นชุดข้อมูล versioned |
| 9 | JSON to CSV Converter | 1/10 | 3 | 4 | 4 | 5 | 2 | อังกฤษ 10/10 แต่ทับกลุ่มเดิมและต้องให้ผู้ใช้ควบคุม flatten array/object |
| 10 | Password Strength Checker | 0/10 | 2 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ต้อง client-only และไม่อ้างเวลาถอดรหัสจากสมมติฐานลวง |
| 11 | Online Signature Maker | 2/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10 แต่ทับ Sign PDF และต้องสื่อว่าไม่ใช่ digital certificate |
| 12 | Invoice Generator | 1/10 | 5 | 5 | 5 | 5 | 3 | อังกฤษ 10/10; กฎเอกสารภาษีและเลขที่เอกสารทำให้ความเสี่ยงสูงกว่า Quotation เดิม |
| 13 | PDF Compressor | 6/10 | 5 | 5 | 5 | 5 | 4 | demand ดีแต่ชะลอ: การ rasterize ทั้งหน้าอาจทำลาย text/search/accessibility และไม่ได้เล็กลงเสมอ |
| 14 | Character Counter | 8/10 | 1 | 3 | 3 | 3 | 1 | ทำง่ายแต่ intent และฟังก์ชันทับ Word Counter ที่มีอยู่แล้ว |
| 15 | Thai Number to Words | 4/1 | 2 | 4 | 3 | 4 | 3 | ใช้จริงในบัญชี แต่ demand ต่ำกว่าและ logic บาทถ้วนมีใน Quotation แล้ว |

Excel to CSV ถูกเลือกเพราะเพิ่มเส้นทางกลับของ CSV to Excel และตอบคำค้น `excel to csv`, `xlsx to csv` และ `แปลง excel เป็น csv` โดยมีความต่างเชิงคุณภาพ: เลือก Worksheet, ส่งออกทุกชีตเป็น ZIP, เลือก comma/semicolon/tab/pipe, CRLF/LF, UTF-8 BOM, Quote ทุกเซลล์, Preview และป้องกัน Formula Injection เป็นค่าเริ่มต้น ไฟล์จำกัด 10 MB, 50 Worksheet, 50,000 แถวต่อชีต, 200 คอลัมน์ และ 500,000 เซลล์รวม งานอ่าน/แปลงอยู่ใน Web Worker และไม่มี API รับ Workbook

ขอบเขตตั้งใจรองรับเฉพาะ `.xlsx` ไม่อ้างรองรับ `.xls`, macro, สูตร,สี, ฟอนต์,รูปภาพ, Chart หรือ merged cell เพราะ CSV เก็บได้เฉพาะค่าตาราง Microsoft ระบุว่า Excel เปิด CSV UTF-8 ได้ตามปกติเมื่อมี BOM จึงเปิด BOM เป็นค่าเริ่มต้นสำหรับภาษาไทย ส่วน `read-excel-file` รองรับ File/Blob/ArrayBuffer และมี export สำหรับ Web Worker จึงเหมาะกับสถาปัตยกรรม client-only ของโครงการ

- [Google Autocomplete — Excel to CSV Converter](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=excel%20to%20csv%20converter)
- [Google Autocomplete — แปลง Excel เป็น CSV](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B9%81%E0%B8%9B%E0%B8%A5%E0%B8%87%20excel%20%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%20csv)
- [Google Autocomplete — XLSX to CSV](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=xlsx%20to%20csv)
- [Microsoft — Opening CSV UTF-8 files correctly in Excel](https://support.microsoft.com/en-US/Excel/opening-csv-utf-8-files-correctly-in-excel)
- [Microsoft — Import or export text and CSV files](https://support.microsoft.com/en-us/excel/get-started/import-or-export-text-txt-or-csv-files)
- [read-excel-file — Browser and Web Worker API](https://github.com/catamphetamine/read-excel-file)
- [Google Search Central — SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google Search Central — Title links](https://developers.google.com/search/docs/appearance/title-link)

## รอบที่ 24 — คำนวณโอที 1.5–3 เท่า และการจัดอันดับ Batch 34

สำรวจเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) และเทียบคำตั้งต้นไทย/อังกฤษ คำว่า `คำนวณโอที` มีคำแนะนำครบ 10/10 และแตกเป็น intent ที่นำไปทำงานได้จริง เช่น วิธีคำนวณ, 1.5 เท่า, รายวัน, วันหยุด, วันอาทิตย์, 2 แรง, 3 แรง และ Excel ขณะที่ `overtime calculator` ได้ 10/10 เช่นกัน จำนวนคำแนะนำเป็นเพียงสัญญาณความกว้างของ intent ไม่ใช่ search volume และไม่รับประกันอันดับ Google

คะแนน 5 คือสูงที่สุด โดยคอลัมน์ “ยาก” หมายถึงความซับซ้อนในการส่งมอบให้ครบและปลอดภัย:

| อันดับ | แนวคิด | TH/EN | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | คำนวณโอที 1.5–3 เท่า | 10/10 | 4 | 5 | 5 | 4 | 3 | ชนะ: intent ไทยตรงมาก แยกรายเดือน/รายวัน/รายชั่วโมง วันทำงานและวันหยุดได้โดยอ้างอิงกฎทางการ |
| 2 | Word Cloud ภาษาไทย | 3/10 | 4 | 4 | 4 | 4 | 4 | ใช้ได้หลายสายงาน แต่ต้องทำ Thai tokenization, stop words, ฟอนต์และ export ให้ครบ |
| 3 | Business Days Calculator | 4/10 | 3 | 4 | 4 | 4 | 3 | มีประโยชน์จริง แต่วันหยุดไทยและองค์กรต้องเป็นข้อมูล versioned |
| 4 | EXIF Viewer / Metadata Remover | 1/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10 และมี privacy value แต่ intent ไทยต่ำกว่า OT ชัดเจน |
| 5 | Expense Splitter | —/10 | 3 | 4 | 4 | 4 | 3 | ใช้ในกลุ่มเพื่อนได้จริง แต่ต้องรองรับเศษ การปัด และใครออกแทนใคร |
| 6 | JSON to CSV Converter | —/10 | 3 | 4 | 4 | 5 | 2 | อังกฤษ 10/10 แต่ทับ catalog ข้อมูลเดิมและต้องควบคุม flatten อย่างโปร่งใส |
| 7 | Password Strength Checker | —/10 | 2 | 4 | 4 | 4 | 3 | อังกฤษ 10/10 แต่ต้องเลี่ยงตัวเลขเวลา crack ที่สร้างความมั่นใจลวง |
| 8 | Color Palette Generator | —/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10 แต่ใกล้ Color Picker เดิม ต้องมี lock, contrast และ export token |
| 9 | Invoice Generator | —/10 | 4 | 5 | 5 | 5 | 3 | อังกฤษ 10/10 ธุรกิจสูง แต่ทับ Quotation และมีความเสี่ยงผู้ใช้เข้าใจเป็นเอกสารภาษี |
| 10 | PDF Text Extractor | —/10 | 4 | 4 | 4 | 4 | 3 | อังกฤษ 10/10 แต่ภาษาไทยและ scanned PDF ต้องแยก OCR ออกจาก text layer |
| 11 | Privacy Policy Generator | —/10 | 4 | 4 | 4 | 4 | 3 | อังกฤษ 10/10 แต่มีความเสี่ยงทางกฎหมายสูงและไม่ควรสร้างข้อความสำเร็จรูปที่อ้างว่าครบถ้วน |
| 12 | Passport Photo Maker | —/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10 แต่กฎรูปแต่ละประเทศเปลี่ยนได้และต้อง versioned |
| 13 | Image Upscaler | —/10 | 5 | 4 | 5 | 5 | 4 | อังกฤษ 10/10 แต่โมเดลใหญ่ ใช้ RAM สูง และ Vercel ไม่ช่วยงาน inference ใน Browser |
| 14 | Pomodoro Timer | —/10 | 2 | 3 | 3 | 4 | 2 | อังกฤษ 10/10 ทำง่าย แต่ความต่างและรายได้ต่ำกว่าเครื่องมือคำนวณงานไทย |
| 15 | PDF Compressor | —/10 | 5 | 5 | 5 | 5 | 4 | อังกฤษ 10/10 แต่ยังชะลอ เพราะ rasterize อาจทำลาย text, search และ accessibility |

ขอบเขตที่เลือกเป็นเครื่องคำนวณแบบ client-only ไม่ขอชื่อ บริษัท หรือสลิป และไม่เก็บค่าจ้าง ผู้ใช้เลือกประเภทค่าจ้างกับสิทธิค่าจ้างวันหยุดเอง สูตรรายเดือนใช้ `ค่าจ้าง ÷ 30 ÷ ชั่วโมงปกติเฉลี่ยต่อวัน`; OT วันทำงานใช้ 1.5 เท่า; เวลาปกติในวันหยุดใช้เงินเพิ่ม 1 เท่าเมื่อได้รับค่าจ้างวันหยุดอยู่แล้ว หรือ 2 เท่าเมื่อไม่ได้รับ; OT วันหยุดใช้ 3 เท่า ระบบไม่ปัดเศษระหว่างคำนวณและแสดง breakdown ทุกส่วน

เนื่องจากงานบางประเภท ข้อตกลง และวันหยุดแต่ละชนิดอาจมีเงื่อนไขต่างกัน หน้าผลลัพธ์ต้องระบุว่าเป็นประมาณการขั้นต่ำทั่วไป ไม่ใช่คำวินิจฉัยสิทธิ พร้อมวันตรวจทานกฎและลิงก์ทางการ แนวทาง SEO ใช้ชื่อและ FAQ ที่ตอบ long-tail จริงโดยไม่สร้างหน้า 1.5, 2 และ 3 เท่าแยกกัน จึงไม่เพิ่ม thin pages และไม่อ้างว่าสามารถทำอันดับหน้าแรกได้แน่นอน

- [Google Autocomplete — คำนวณโอที](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B9%82%E0%B8%AD%E0%B8%97%E0%B8%B5)
- [Google Autocomplete — Overtime Calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=overtime%20calculator)
- [กระทรวงแรงงาน — ค่าทำงานล่วงเวลาในวันทำงานและวันหยุด](https://www.mol.go.th/forums/topic/%E0%B9%80%E0%B8%87%E0%B8%B4%E0%B8%99%E0%B8%84%E0%B9%88%E0%B8%B2%E0%B8%97%E0%B8%B3%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%A5%E0%B9%88%E0%B8%A7%E0%B8%87%E0%B9%80%E0%B8%A7%E0%B8%A5%E0%B8%B2-2)
- [กระทรวงแรงงาน — ค่าทำงานในวันหยุด](https://www.mol.go.th/forums/topic/%E0%B8%AA%E0%B8%AD%E0%B8%9A%E0%B8%96%E0%B8%B2%E0%B8%A1-%E0%B9%80%E0%B8%A3%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%97%E0%B8%B3%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B9%83%E0%B8%99%E0%B8%A7%E0%B8%B1%E0%B8%99%E0%B8%AB%E0%B8%A2%E0%B8%B8%E0%B8%94%E0%B8%99%E0%B8%B1%E0%B8%81%E0%B8%82%E0%B8%B1%E0%B8%95%E0%B8%A4%E0%B8%81%E0%B8%A9%E0%B9%8C)
- [พ.ร.บ. คุ้มครองแรงงาน พ.ศ. 2541 — สำเนาข้อความสำนักงานคณะกรรมการกฤษฎีกาบนเว็บไซต์รัฐ](https://tdc.mi.th/assets/pdf/regulations/002/%E0%B8%9E.%E0%B8%A3.%E0%B8%9A.%E0%B8%84%E0%B8%B8%E0%B9%89%E0%B8%A1%E0%B8%84%E0%B8%A3%E0%B8%AD%E0%B8%87%E0%B9%81%E0%B8%A3%E0%B8%87%E0%B8%87%E0%B8%B2%E0%B8%99%20%E0%B8%9E.%E0%B8%A8.%202541.pdf)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

## รอบที่ 25 — คำนวณค่าน้ำมันและค่าเดินทาง และการจัดอันดับ Batch 35

สำรวจเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) จำนวน 25 คำตั้งต้น คำว่า `คำนวณค่าน้ำมัน` ได้คำแนะนำ 10/10 และแตกเป็น intent ระยะทาง รถยนต์ ไปต่างจังหวัด ไป-กลับ และมอเตอร์ไซค์ ขณะที่ `fuel cost calculator` ได้ 10/10 และมี trip intent ชัดเจน จำนวนคำแนะนำเป็นสัญญาณความกว้างของ intent เท่านั้น ไม่ใช่ search volume และไม่รับประกันอันดับ Google

คะแนน 5 คือสูงที่สุด โดย “ยาก” หมายถึงความซับซ้อนในการส่งมอบให้ครบและปลอดภัย:

| อันดับ | แนวคิด | TH/EN | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | คำนวณค่าน้ำมันและค่าเดินทาง | 10/10 | 2 | 5 | 5 | 5 | 3 | ชนะ: demand ไทยตรงที่สุด ใช้ได้กับคนเดินทาง ส่งของ เซลส์ รถบริษัท และหารค่าเดินทาง โดยไม่ต้องใช้ API |
| 2 | Word Cloud ภาษาไทย | 5/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10 แต่ต้องพิสูจน์ Thai tokenization, stop words, layout และ export |
| 3 | Business Days Calculator | 4/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10 แต่วันหยุดไทยและวันหยุดองค์กรต้องใช้ข้อมูล versioned |
| 4 | Working Hours Calculator | 2/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10 แต่ใกล้ Overtime และต้องแยกพัก กะข้ามวัน กับสิทธิแรงงาน |
| 5 | Expense Splitter | 2/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10 แต่ต้องรองรับใครจ่ายแทนใคร เศษ และการหารไม่เท่ากันจึงจะต่างจาก Fuel Cost |
| 6 | Subtitle Converter | —/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10 รองรับ SRT/VTT/encoding ได้ แต่ intent ไทยยังไม่ตรวจพบในรอบนี้ |
| 7 | PDF Text Extractor | —/10 | 4 | 4 | 4 | 4 | 3 | อังกฤษ 10/10 แต่ต้องแยก text layer จาก OCR และรับมือภาษาไทยอย่างโปร่งใส |
| 8 | Shift Schedule Maker | —/10 | 5 | 5 | 5 | 5 | 4 | อังกฤษ 10/10 แต่ constraint คน กะ วันลา และความเป็นธรรมทำให้ scope ใหญ่ |
| 9 | Image Metadata Remover | 1/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10 และ privacy สูง แต่ demand ไทยยังต่ำกว่าเครื่องมือค่าน้ำมันมาก |
| 10 | CSV to JSON Converter | —/10 | 3 | 4 | 4 | 5 | 2 | อังกฤษ 10/10 แต่ทับ catalog ข้อมูลเดิมและต้องควบคุมชนิดข้อมูล/โครงสร้างอย่างชัดเจน |
| 11 | Invoice Generator | —/10 | 4 | 5 | 5 | 5 | 3 | อังกฤษ 10/10 แต่ทับ Quotation และเสี่ยงถูกเข้าใจเป็นใบกำกับภาษีหรือหลักฐานรับเงิน |
| 12 | Timeline Maker | —/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10 แต่ต้องมี editor, layout, export และ accessibility มากกว่าหน้าแบบฟอร์ม |
| 13 | Lorem Ipsum Generator ภาษาไทย | —/10 | 2 | 3 | 3 | 4 | 2 | อังกฤษ 10/10 และมี long-tail Thai แต่คุณค่าธุรกิจและความต่างต่ำกว่า |
| 14 | Countdown Timer | 0/10 | 2 | 3 | 3 | 4 | 2 | อังกฤษ 10/10 แต่ intent ไทยที่ทดสอบไม่ขึ้นคำแนะนำ และใช้งานซ้ำกับระบบนาฬิกาทั่วไป |
| 15 | Freelance Rate Calculator | 0/10 | 4 | 4 | 4 | 4 | 3 | อังกฤษ 10/10 แต่ไทยไม่ขึ้นคำแนะนำและสมมติฐานรายได้/ชั่วโมงเสี่ยงให้คำตอบลวง |

Fuel Cost Calculator ที่ส่งมอบรับระยะทางขาเดียวแล้วคูณสองเมื่อเลือกไป-กลับ รองรับทั้ง กม./ลิตร (`ลิตรที่ใช้ = ระยะทาง ÷ กม./ลิตร`) และลิตร/100 กม. (`ลิตรที่ใช้ = ระยะทาง × ลิตร/100 กม. ÷ 100`) ก่อนคูณราคาต่อลิตร ผู้ใช้เพิ่มค่าทางด่วน จอดรถ และค่าอื่นเพื่อดูยอดรวม ต้นทุนต่อกิโลเมตร และหารเท่ากันต่อคนได้ ระบบไม่ปัดเศษระหว่างทางและไม่เดาราคาน้ำมันสด

คู่แข่งที่ตรวจใช้ round-trip toggle, toll/parking, cost per distance และ passenger split เป็น baseline หน้าของ Meaw Tools จึงรวม feature เหล่านี้ใน workflow เดียว แต่ไม่เรียก Maps/GPS ไม่รับพิกัด และไม่ส่งข้อมูลไป Server ราคาขายปลีกเปลี่ยนตามชนิด พื้นที่ ปั๊ม และเวลา จึงให้ผู้ใช้กรอกเองพร้อมลิงก์สำนักงานนโยบายและแผนพลังงานแทนการฝังค่า versioned ที่ล้าสมัย

SEO ใช้ primary intent เดียวพร้อม FAQ ตอบคำค้นระยะทาง ไป-กลับ หน่วย และหารกับเพื่อน ไม่สร้าง thin page แยกสำหรับรถยนต์ มอเตอร์ไซค์ หรือต่างจังหวัด แนวทางนี้ยึด people-first content และไม่อ้างว่าสามารถทำอันดับหน้าแรกได้แน่นอน

- [Google Autocomplete — คำนวณค่าน้ำมัน](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B8%84%E0%B9%88%E0%B8%B2%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%A1%E0%B8%B1%E0%B8%99)
- [Google Autocomplete — Fuel Cost Calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=fuel%20cost%20calculator)
- [สำนักงานนโยบายและแผนพลังงาน — ราคาขายปลีกน้ำมัน](https://www.eppo.go.th/energy-price/oil-retail-price-today/%E0%B9%82%E0%B8%84%E0%B8%A3%E0%B8%87%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%A3%E0%B8%B2%E0%B8%84%E0%B8%B2%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%A1%E0%B8%B1%E0%B8%99%E0%B8%A7%E0%B8%B1%E0%B8%99-2/)
- [Numbersmith — Trip Cost Calculator feature baseline](https://numbersmith.co.uk/calculators/trip-cost-calculator)
- [FuelCalc — Fuel Cost Formula](https://www.fuelcalc.com.au/)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

## รอบที่ 27 — Business Days Calculator และการจัดอันดับ Batch 37

สำรวจเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) และตรวจเครื่องมือที่เปิดใช้งานจริง คำว่า `business days calculator`, `working days calculator` และ `workday calculator` ได้คำแนะนำ 10/10 ทั้งหมด ส่วน `คำนวณวันทำงาน` และ `นับวันทำงาน` ได้ 4/10, `นับวันทำงาน ไม่รวมเสาร์อาทิตย์` ได้ 3/10 และ `วันหยุดธนาคาร 2569` ได้ 10/10 จำนวนคำแนะนำใช้เป็น demand proxy เพื่อดูความกว้างของ intent ไม่ใช่ search volume และไม่รับประกันอันดับ Google

คะแนน 5 คือสูงที่สุด โดย “ยาก” รวมความซับซ้อนของข้อมูลที่ต้อง version, UX, ความปลอดภัย และการพิสูจน์ผล:

| อันดับ | แนวคิด | สัญญาณ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | Business Days Calculator | EN 10/10, TH 4/10, วันหยุดธนาคาร 10/10 | 3 | 5 | 4 | 5 | 3 | ส่งมอบ Batch 37: range/shift, workweek, endpoint policy, holidays, breakdown และ CSV |
| 2 | Working Hours Calculator | EN 10/10, TH 2/10 | 3 | 5 | 4 | 5 | 3 | แยกจากวันทำงานด้วยเวลาเริ่ม/จบ พัก กะข้ามวัน และหลายกะ โดยไม่ตีความสิทธิแรงงาน |
| 3 | Expense Splitter | EN 10/10, TH 2/10 | 3 | 5 | 4 | 5 | 3 | ต้องรองรับใครออกแทนใคร สัดส่วนไม่เท่ากัน เศษ และสรุปยอดโอนให้น้อยรายการ |
| 4 | Subtitle Converter SRT/VTT | EN 10/10 | 3 | 4 | 4 | 4 | 3 | รักษาเวลา numbering line breaks และ encoding พร้อมตรวจ cue ที่ผิด โดยไม่อ้างว่าแปลภาษา |
| 5 | Image Metadata Remover | EN 10/10, TH 1/10 | 4 | 4 | 4 | 4 | 4 | privacy value สูงแต่ต้องพิสูจน์ EXIF/XMP/IPTC หลัง encode และเตือนเรื่องคุณภาพภาพ |
| 6 | CSV to JSON Converter | EN 10/10 | 3 | 4 | 4 | 5 | 3 | ต้องควบคุมชนิดข้อมูล nested paths และ arrays เพื่อไม่เป็น thin page ทับ CSV tools เดิม |
| 7 | PDF Text Extractor | EN 10/10 | 4 | 4 | 4 | 4 | 3 | แยก text layer จาก OCR, ลำดับหลายคอลัมน์, password และขนาดไฟล์อย่างตรงไปตรงมา |
| 8 | Shift Schedule Maker | EN 10/10 | 5 | 5 | 5 | 5 | 5 | รองรับพนักงาน กะ วันลา ชั่วโมงสูงสุด coverage และ fairness แต่ scope ใหญ่กว่าหน้า calculator |
| 9 | Color Palette Generator | EN 10/10, TH 0/10 | 3 | 4 | 4 | 4 | 3 | ต้องมี lock color, contrast, color-blind preview และ export design tokens จึงต่างจาก Color Picker |
| 10 | Timeline Maker | EN 10/10 | 4 | 4 | 4 | 4 | 4 | editor ต้องรองรับ keyboard order, responsive layout, print และ export ที่ยังอ่านได้ |
| 11 | Freelance Rate Calculator | EN 10/10, TH 0/10 | 4 | 4 | 4 | 4 | 3 | เปิดสมมติฐานวันขายได้ ค่าใช้จ่าย วันลา buffer และภาษี ไม่ให้ผลลัพธ์ดูเป็นเรตรับรอง |
| 12 | Salary Proration Calculator | long-tail งาน HR | 4 | 5 | 4 | 4 | 3 | ต้องเลือกฐาน 30 วัน/วันปฏิทิน/วันทำงาน และไม่ทับ Salary Calculator แบบหน้าเนื้อหาบาง |
| 13 | Invoice Generator | EN 10/10 | 4 | 5 | 5 | 5 | 3 | ทับ Quotation บางส่วนและเสี่ยงถูกเข้าใจเป็นใบกำกับภาษีหรือหลักฐานรับเงิน จึงต้องคุมคำเรียก |
| 14 | Countdown Timer | EN 10/10, TH 0/10 | 2 | 3 | 3 | 4 | 2 | ทำฟรีได้แต่ถูกแทนนาฬิการะบบง่าย ต้องมี shareable target, timezone และ background tab accuracy |
| 15 | Lorem Ipsum ภาษาไทย | long-tail เนื้อหาตัวอย่าง | 2 | 3 | 3 | 4 | 2 | ทำง่ายแต่คุณค่าต่ำกว่าและต้องบอกชัดว่าเป็น placeholder ไม่ใช่ข้อความสำหรับเผยแพร่จริง |

รุ่นที่ส่งมอบแก้จุดกำกวมของการนับวันโดยตรง: แยกโหมด “นับระหว่างสองวันที่” กับ “เพิ่ม/ลบวันทำการ”, ให้ผู้ใช้เลือกว่าจะรวมวันต้นทางและปลายทางหรือไม่, เลือกวันทำงานใดก็ได้ในสัปดาห์, เพิ่มวันหยุดองค์กร และแสดงสูตร `วันปฏิทิน − วันหยุดประจำสัปดาห์ − วันหยุดที่ตรงกับวันทำงาน` พร้อมตารางรายเดือน รายวัน และ CSV ฟังก์ชันลักษณะเดียวกับ `NETWORKDAYS.INTL` และ `WORKDAY.INTL` แต่ไม่ผูกกับ Excel และประมวลผลใน Browser

ข้อมูล preset ใช้วันหยุดสถาบันการเงินและสถาบันการเงินเฉพาะกิจของธนาคารแห่งประเทศไทยปี 2569 จำนวน 19 วันในรายการหลัก และมีตัวเลือกกรุงเทพมหานคร 20 วันซึ่งเพิ่มวันศุกร์ที่ 16 ตุลาคม 2569 ชุดข้อมูลระบุปีและวันที่อัปเดต ไม่เหมารวมเป็นวันหยุดบริษัท วันหยุดราชการ หรือวันหยุดของทุกพื้นที่ และไม่ hardcode วันเพิ่มของธนาคารอิสลามหรือสาขาบางจังหวัดภาคใต้ที่ต้องอ้างประกาศเฉพาะ ผู้ใช้ต้องตรวจประกาศที่ใช้กับองค์กรของตนและกรอกวันเพิ่มเติมได้สูงสุด 500 รายการ

SEO แยก primary intent ของหน้าใหม่นี้เป็น `คำนวณวันทำงาน` ส่วน Date Calculator เดิมคง intent `คำนวณวัน` และเอาคำรองเกี่ยวกับวันทำงานออกเพื่อลด semantic cannibalization หน้าเดียวรวมคำไทย/อังกฤษ, NETWORKDAYS, วันหยุดธนาคาร และการเพิ่มวันทำการเพราะเป็น workflow เดียวกัน ไม่สร้าง thin page แยกตามคำค้น และไม่อ้างรับประกันหน้าแรก

- [Google Autocomplete — business days calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=business%20days%20calculator)
- [Google Autocomplete — working days calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=working%20days%20calculator)
- [Google Autocomplete — คำนวณวันทำงาน](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B8%A7%E0%B8%B1%E0%B8%99%E0%B8%97%E0%B8%B3%E0%B8%87%E0%B8%B2%E0%B8%99)
- [Google Autocomplete — วันหยุดธนาคาร 2569](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%A7%E0%B8%B1%E0%B8%99%E0%B8%AB%E0%B8%A2%E0%B8%B8%E0%B8%94%E0%B8%98%E0%B8%99%E0%B8%B2%E0%B8%84%E0%B8%B2%E0%B8%A3%202569)
- [ธนาคารแห่งประเทศไทย — วันหยุดของสถาบันการเงิน](https://www.bot.or.th/th/financial-institutions-holiday.html)
- [ธนาคารแห่งประเทศไทย — วันหยุดพิเศษ 16 ตุลาคม 2569 ในกรุงเทพมหานคร](https://www.bot.or.th/th/news-and-media/news/news-20260609.html)
- [Microsoft Support — NETWORKDAYS.INTL](https://support.microsoft.com/th-th/office/%E0%B8%9F%E0%B8%B1%E0%B8%87%E0%B8%81%E0%B9%8C%E0%B8%8A%E0%B8%B1%E0%B8%99-networkdays-intl-a9b26239-4f20-46a1-9ab8-4e925bfd5e28)
- [Microsoft Support — WORKDAY.INTL](https://support.microsoft.com/en-us/excel/workday-intl-function)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

## รอบที่ 26 — Word Cloud ภาษาไทย และการจัดอันดับ Batch 36

สำรวจเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) และตรวจเครื่องมือที่เปิดใช้งานจริง คำว่า `word cloud generator`, `word cloud maker` และ `word cloud online` ได้คำแนะนำ 10/10 ส่วน `word cloud ภาษาไทย` ได้ 5/10 และ `สร้าง word cloud` ได้ 3/10 โดยแตกเป็น intent ฟรี, online, students, phrases และ shapes จำนวนคำแนะนำเป็น demand proxy ที่บอกความกว้างของ intent ไม่ใช่ search volume และไม่รับประกันอันดับ Google

คะแนน 5 คือสูงที่สุด โดย “ยาก” หมายถึงความซับซ้อนในการส่งมอบให้ครบ ปลอดภัย และไม่สร้างหน้าบาง:

| อันดับ | แนวคิด | TH/EN | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | Word Cloud ภาษาไทย | 5/10 | 4 | 4 | 4 | 4 | 4 | ส่งมอบ Batch 36: ตัดคำไทย, stopwords, weighted phrases, deterministic layout และ PNG/SVG/CSV |
| 2 | Business Days Calculator | 4/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ต้อง version วันหยุดไทยและแยกวันหยุดองค์กรจากวันหยุดราชการ |
| 3 | Working Hours Calculator | 2/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ต้องรองรับพัก กะข้ามวัน และแยกการนับเวลาจากคำแนะนำสิทธิแรงงาน |
| 4 | Expense Splitter | 2/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ควรรองรับใครจ่ายแทนใคร เศษ และสัดส่วนไม่เท่ากัน |
| 5 | Subtitle Converter SRT/VTT | —/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ต้องรักษาเวลา numbering line break และ encoding โดยไม่อ้างว่าแปลภาษา |
| 6 | PDF Text Extractor | —/10 | 4 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ต้องบอกชัดว่า text layer ต่างจาก OCR และตรวจลำดับข้อความหลายคอลัมน์ |
| 7 | Image Metadata Remover | 1/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10; privacy value สูงแต่ต้องพิสูจน์ว่า EXIF/XMP/IPTC ถูกลบจริงหลัง encode |
| 8 | CSV to JSON Converter | —/10 | 3 | 4 | 4 | 5 | 2 | อังกฤษ 10/10; ต้องควบคุมชนิดข้อมูล nested paths และไม่ทับ CSV tools เดิมแบบ thin page |
| 9 | Shift Schedule Maker | —/10 | 5 | 5 | 5 | 5 | 4 | อังกฤษ 10/10; scope ใหญ่เพราะต้องจัดคน กะ วันลา ชั่วโมงสูงสุด และ fairness |
| 10 | Color Palette Generator | 0/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ต้องมี lock color, contrast และ export tokens เพื่อแตกต่างจาก Color Picker |
| 11 | Timeline Maker | —/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10; ต้องมี editor, keyboard order, responsive layout และ export ที่อ่านได้ |
| 12 | Lorem Ipsum ภาษาไทย | —/10 | 2 | 3 | 3 | 4 | 2 | ทำฟรีได้ แต่ต้องสร้างข้อความตัวอย่างที่ไม่ทำให้เข้าใจว่าเป็นเนื้อหาจริงและคุณค่าต่ำกว่า |
| 13 | Countdown Timer | 0/10 | 2 | 3 | 3 | 4 | 2 | อังกฤษ 10/10; intent ไทยที่ทดสอบยังไม่ขึ้นและถูกแทนด้วยนาฬิการะบบได้ง่าย |
| 14 | Freelance Rate Calculator | 0/10 | 4 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ต้องเปิดสมมติฐานวันทำงาน ค่าใช้จ่าย ภาษี และเวลาที่ขายไม่ได้อย่างโปร่งใส |
| 15 | Invoice Generator | —/10 | 4 | 5 | 5 | 5 | 3 | อังกฤษ 10/10 แต่ทับ Quotation และต้องป้องกันการเข้าใจผิดว่าเป็นใบกำกับภาษีหรือหลักฐานรับเงิน |

เครื่องมือที่ส่งมอบมีสอง workflow: ตัดคำจากข้อความด้วย `Intl.Segmenter` เมื่อ Browser รองรับ พร้อมกรองคำทั่วไปไทย/อังกฤษ ตัวเลข คำสั้น ความถี่ และ custom stopwords; หรือรับหนึ่งคำ/วลีต่อบรรทัดพร้อมน้ำหนักเพื่อรักษาชื่อเฉพาะและคำประสม ผู้ใช้ตรวจตารางความถี่ก่อนส่งออกได้ การจัดวางใช้ seed เดิมให้ผลซ้ำได้ สลับตำแหน่งได้ และ escape user text ก่อนสร้าง SVG เพื่อไม่ให้ข้อความกลายเป็น markup

คู่แข่งปัจจุบันใช้ palette, shape, rotation, manual weights และ PNG/SVG เป็น baseline รุ่นนี้เลือกส่งมอบสิ่งที่จบงานหลักก่อน ได้แก่ สี พื้นหลังโปร่งใส การหมุน weighted phrases, PNG 2×, SVG และ CSV พร้อมข้อจำกัด 100,000 ตัวอักษร การตัดคำและสร้างไฟล์ทำใน Browser ทั้งหมด Word Cloud เป็นภาพความถี่ ไม่ใช่ sentiment, topic model หรือข้อสรุปวิจัย จึงมีคำเตือนให้กลับไปอ่านบริบทต้นฉบับ

SEO รวม intent ภาษาไทยและอังกฤษไว้หน้าเดียว ไม่สร้าง thin page แยกสำหรับ tag cloud, students, phrases หรือ transparent PNG FAQ ตอบการตัดคำไทย รูปแบบไฟล์ ความเป็นส่วนตัว และข้อจำกัดจริงตามแนวทาง people-first content โดยไม่อ้างรับประกันหน้าแรก

- [Google Autocomplete — Word Cloud Generator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=word%20cloud%20generator)
- [Google Autocomplete — Word Cloud Maker](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=word%20cloud%20maker)
- [Google Autocomplete — Word Cloud ภาษาไทย](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=word%20cloud%20%E0%B8%A0%E0%B8%B2%E0%B8%A9%E0%B8%B2%E0%B9%84%E0%B8%97%E0%B8%A2)
- [Google Autocomplete — สร้าง Word Cloud](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%20word%20cloud)
- [Jason Davies — Word Cloud Generator](https://www.jasondavies.com/wordcloud/)
- [WordClouds.com — Word Cloud Generator](https://www.wordclouds.com/)
- [MDN — Intl.Segmenter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter)
- [MDN — SVG text](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/text)
- [MDN — HTMLCanvasElement.toBlob()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

## รอบที่ 23 — Resume Builder ไทย/English และการจัดอันดับ Batch 33

สำรวจเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) ทั้งคำไทยและอังกฤษ พร้อมตรวจคู่แข่งและคำแนะนำรูปแบบ Resume จากสถาบันการศึกษา จำนวนคำแนะนำสูงสุด 10 รายการเป็นเพียงสัญญาณความกว้างของ intent ไม่ใช่ search volume และไม่รับประกันอันดับ Google หรือผล ATS

คะแนน 5 คือสูงที่สุด:

| อันดับ | แนวคิด | สัญญาณ Autocomplete | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | Resume Builder ไทย/English | EN 10/10, ไทย 8–10/10 | 5 | 5 | 5 | 5 | 4 | ชนะและส่งมอบ: free/no sign up/PDF มี intent ชัด และทำเวอร์ชันครบแบบ client-only ได้ |
| 2 | Word Cloud ภาษาไทย | EN 10/10, ไทย 3/10 | 4 | 4 | 4 | 4 | 4 | ต้องพิสูจน์ tokenization, stop words, ฟอนต์ และ PNG/SVG |
| 3 | Business Days Calculator | EN 10/10, ไทย 4/10 | 3 | 4 | 4 | 4 | 3 | ต้องแยกเสาร์อาทิตย์, วันหยุดราชการ และวันหยุดองค์กร |
| 4 | Remove Image Metadata | EN 10/10, ไทย 1/10 | 4 | 4 | 4 | 4 | 4 | มี privacy value แต่ต้องตรวจ EXIF/XMP/IPTC หลัง encode จริง |
| 5 | JSON to CSV Converter | EN 10/10, ไทย 1/10 | 3 | 4 | 4 | 5 | 2 | ต้องอธิบาย flatten object/array และหลีกเลี่ยง keyword ชนกลุ่ม CSV เดิม |
| 6 | Password Strength Checker | EN 10/10 | 2 | 4 | 4 | 4 | 3 | ทำ client-only ได้ แต่ไม่ควรอ้างเวลา crack จากสมมติฐานลวง |
| 7 | Color Palette Generator | EN 10/10 | 3 | 4 | 4 | 4 | 3 | ต้องมี contrast, lock color และ export token จึงต่างจาก Color Picker |
| 8 | PDF Compressor | EN/ไทย 10/10 | 5 | 5 | 5 | 5 | 4 | ชะลอ: rasterize ทำลาย text/search/accessibility และไม่รับประกันว่าเล็กลง |
| 9 | Overtime Estimator | long-tail 1.5/2/3 เท่า | 4 | 4 | 4 | 4 | 3 | ต้องตรวจกฎหมายปัจจุบันและแยกรายวัน/รายเดือน |
| 10 | Privacy Policy Generator | EN 10/10 | 4 | 4 | 4 | 4 | 3 | เสี่ยงให้คำแนะนำเชิงกฎหมาย; ต้องมี jurisdiction/version และ disclaimer ชัด |
| 11 | Passport Photo Maker | EN 10/10 | 4 | 4 | 4 | 4 | 4 | ต้อง version กฎขนาดรูปแต่ละประเทศและไม่อ้างผ่านราชการ |
| 12 | Image Upscaler | EN 10/10 | 5 | 4 | 5 | 5 | 4 | โมเดล client-side ใช้ RAM สูง ต้องมี fallback และวัดคุณภาพจริง |
| 13 | Pomodoro Timer | EN 10/10 | 2 | 3 | 3 | 4 | 2 | ทำง่ายแต่คู่แข่งสูง ต้องมี persistence/notification ที่ไม่รบกวน |
| 14 | Aspect Ratio Calculator | EN 10/10, ไทย 1/10 | 2 | 3 | 3 | 4 | 2 | ใกล้ Image Cropper เดิม ควรขยายหน้าเดิมแทน thin page |
| 15 | File Checksum Calculator | EN 10/10 | 2 | 4 | 3 | 4 | 3 | ทับ Hash Generator; ควรเพิ่มโหมดไฟล์ในหน้าเดิมเมื่อจะทำ |

Resume Builder ถูกเลือกเพราะ `resume builder`, `resume builder online`, `resume builder free`, `cv maker`, `ats resume checker`, `สร้าง resume`, `สร้างเรซูเม่` และ `เรซูเม่ สมัครงาน` มีคำแนะนำต่อเนื่องทั้งสองภาษา คู่แข่งปัจจุบันวาง baseline ที่ผู้ใช้คาดหวังไว้สูง: ฟรี, ไม่ต้องสมัคร, ไม่มีลายน้ำ, local processing, live preview และ PDF ดังนั้นเวอร์ชันที่ส่งมอบจึงรองรับไทย/อังกฤษ, สองสไตล์ Single column, ไม่ใช้รูป/ตาราง/กล่องข้อความ, จัดลำดับประสบการณ์/การศึกษา, PDF A4 ฝัง Sarabun พร้อม text layer, Plain text สำหรับตรวจลำดับ และ Keyword coverage ที่นับแบบ deterministic

ขอบเขตตั้งใจไม่แสดงคะแนนผ่าน/ไม่ผ่าน ATS เพราะระบบและกฎของแต่ละบริษัทต่างกัน Keyword coverage ไม่ใช่ ATS score และไม่แนะนำให้ใส่คำที่ไม่มีประสบการณ์จริง ข้อมูลทั้งหมดอยู่ในหน่วยความจำ Browser, ไม่ใช้ LocalStorage และหายเมื่อ refresh หรือปิดหน้า

- [Google Autocomplete — resume builder](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=resume%20builder)
- [Google Autocomplete — resume builder free](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=resume%20builder%20free)
- [Google Autocomplete — สร้างเรซูเม่](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B9%80%E0%B8%A3%E0%B8%8B%E0%B8%B9%E0%B9%80%E0%B8%A1%E0%B9%88)
- [NoBsResume — Thai Resume Builder](https://nobsresume.com/resume-builder/thai)
- [OpenResume — Resume Builder](https://www.open-resume.com/)
- [Assumption University — Resume Checklist](https://cdn.uconnectlabs.com/wp-content/uploads/sites/11/2024/07/Resume-Checklist-2.pdf)
- [Adobe — PDF Reference 1.5](https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/pdfreference1.5_v6.pdf)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

## รอบที่ 22 — Favicon/PWA Icon Generator และการจัดอันดับ Batch 32

สำรวจเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) ทั้งคำไทยและอังกฤษ พร้อมตรวจคู่แข่งและมาตรฐานจาก W3C, Apple, MDN และ web.dev จำนวนคำแนะนำสูงสุด 10 รายการเป็นเพียงสัญญาณความกว้างของ search intent ไม่ใช่ search volume และไม่รับประกันอันดับ Google การเลือกงานยังพิจารณาความครบที่ทำได้ฟรี, ความเป็นส่วนตัว, catalog overlap, ความเสี่ยง และโอกาสสร้างเนื้อหาที่ช่วยผู้ใช้จริง

คะแนน 5 คือสูงที่สุด:

| อันดับ | แนวคิด | สัญญาณ Autocomplete | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | Favicon / PWA Icon Generator | `favicon generator` 10/10, `pwa icon generator` 10/10, ไทย 2/10 | 3 | 4 | 4 | 4 | 3 | ชนะและส่งมอบ: intent แตก ICO, PNG, Apple touch, maskable, manifest และสร้างแพ็กครบใน Browser ได้ |
| 2 | Resume Builder | EN 10/10, TH 8/10 | 5 | 5 | 5 | 5 | 4 | มูลค่าสูง แต่ต้องมี ATS semantics, PDF ภาษาไทย, privacy และหลาย template จึงไม่ควรปล่อยบาง |
| 3 | Word Cloud ภาษาไทย | EN 10/10, TH 3/10 | 4 | 4 | 4 | 4 | 4 | ต้องพิสูจน์ tokenization ภาษาไทย, stop words, ฟอนต์ และ export PNG/SVG |
| 4 | Business Days Calculator | EN 10/10, TH 4/10 | 3 | 4 | 4 | 4 | 3 | ต้อง version วันหยุดไทยและแยกวันหยุดราชการออกจากวันหยุดองค์กร |
| 5 | Remove Image Metadata | EN 10/10, TH 1/10 | 4 | 4 | 4 | 4 | 4 | มี privacy value แต่ต้องตรวจ EXIF/XMP/IPTC ของไฟล์ผลจริงในแต่ละ format |
| 6 | JSON to CSV Converter | EN 10/10, TH 1/10 | 3 | 4 | 4 | 5 | 2 | ต้องออกแบบ flatten object/array ชัดเจนและหลีกเลี่ยง keyword ชนกลุ่ม CSV เดิม |
| 7 | Password Strength Checker | EN 10/10, TH 0/10 | 2 | 4 | 4 | 4 | 3 | ทำ client-only ได้ แต่ห้ามอ้างเวลาถอดรหัสจากสมมติฐานที่พิสูจน์ไม่ได้ |
| 8 | Color Palette Generator | EN 10/10, TH 0/10 | 3 | 4 | 4 | 4 | 3 | ต้องมี contrast, lock color และ export design token จึงต่างจาก Color Picker เดิม |
| 9 | File Checksum Calculator | EN 10/10, TH 0/10 | 2 | 4 | 3 | 4 | 3 | ควรขยาย Hash Generator เดิมแทนสร้างหน้าใหม่บาง ๆ |
| 10 | Aspect Ratio Calculator | EN 10/10, TH 1/10 | 2 | 3 | 3 | 4 | 2 | ทับฟังก์ชัน Image Cropper บางส่วน; ต้องมีชุดงานวิดีโอ/จอภาพจึงคุ้มหน้าใหม่ |
| 11 | PDF Compressor | EN/TH 10/10 | 5 | 5 | 5 | 5 | 4 | ชะลอ: การ rasterize ทำลาย text/search/accessibility และไม่รับประกันว่าไฟล์เล็กลง |
| 12 | Online Signature Maker | EN กว้าง, TH 2/10 | 3 | 4 | 4 | 4 | 3 | ทับ Sign PDF และต้องสื่อว่าไฟล์ภาพลายเซ็นไม่ใช่ digital certificate |
| 13 | Character Counter | EN/TH 8–10/10 | 1 | 3 | 3 | 3 | 1 | ขยาย Word Counter เดิมดีกว่าสร้างหน้า keyword ซ้ำ |
| 14 | Overtime Estimator | long-tail 1.5/2/3 เท่า | 4 | 4 | 4 | 4 | 3 | ต้องตรวจฐานกฎหมายปัจจุบันและแยกรายวัน/รายเดือนก่อนพัฒนา |
| 15 | QR Code Styling Studio | EN กว้าง, ไทยเฉพาะทางต่ำ | 3 | 3 | 4 | 4 | 3 | ควรขยาย QR Generator เดิมเมื่อมี logo/error-correction และ scan verification |

`favicon generator` คืนคำแนะนำ 10 รายการ เช่น free, online, AI, from PNG/SVG/image/text/JPG และ `favicon ico generator` ระบุการสร้าง ICO โดยตรง ส่วน `pwa icon generator` คืน 10 รายการและแตกเป็น online, free, from SVG, maskable, Apple touch และ manifest ทำให้ scope ที่ตอบ intent จริงต้องมากกว่า resize รูปหนึ่งขนาด: รุ่นที่ส่งมอบจึงสร้าง PNG 16/32/48, Apple touch 180, PWA 192/512, Maskable 512, ICO ที่ฝัง PNG 16/32/48, `site.webmanifest`, HTML และ README รวม 11 ไฟล์ใน ZIP

คู่แข่งที่ตรวจ เช่น PWA Icos, Favicon Builder, Snappicon, Icon Forge และ ConsoleLog Tools มีองค์ประกอบร่วมคือ ICO หลายขนาด, Apple touch, PWA/manifest, maskable หรือ ZIP การส่งมอบจึงสร้างไฟล์จริงแทนแสดงเพียง Preview และอ่าน/วาดรูปใน Browser โดยไม่ส่งโลโก้ไป API รับเฉพาะ PNG/JPG/WebP สูงสุด 10 MB / 40 ล้านพิกเซล พร้อมปิด `ImageBitmap` และคืน Blob URL เพื่อจำกัดหน่วยความจำ

Maskable preview ใช้ safe zone ตาม W3C: วงกลมกึ่งกลางรัศมี 40% ของขนาดไอคอน และไม่สร้างพื้นโปร่งใสสำหรับ purpose `maskable` รุ่นนี้บังคับจัดวางแบบเห็นโลโก้ครบและเว้นขอบอย่างน้อย 10% สำหรับไฟล์ maskable แม้ไอคอนทั่วไปเลือก crop แบบเต็มพื้นที่ Apple touch icon ใช้ 180×180 ตามตัวอย่างของ Apple ส่วน `favicon.ico` มี 16/32/48 เพื่อรองรับบริบทขนาดเล็กหลายแบบ

SEO audit เพิ่มกฎห้าม secondary keyword ของหน้าหนึ่งตรงกับ primary keyword ของอีกหน้าแบบ exact match และแก้ `url-encoder` ที่เคยมีคำรอง `เปอร์เซ็นต์` ชน primary ของ Percentage Calculator เป็นคำเฉพาะ `url percent encoding` / `เข้ารหัสเปอร์เซ็นต์ url` เพื่อไม่ให้หน้าแข่งกันเอง ทั้งนี้ metadata, FAQ, sitemap และ internal links ช่วยความเข้าใจหน้าแต่ไม่สามารถรับประกันอันดับแรก Google ได้

- [Google Autocomplete — favicon generator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=favicon%20generator)
- [Google Autocomplete — favicon ico generator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=favicon%20ico%20generator)
- [Google Autocomplete — pwa icon generator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=pwa%20icon%20generator)
- [Google Autocomplete — สร้าง favicon](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%20favicon)
- [W3C — Web App Manifest](https://www.w3.org/TR/appmanifest/)
- [web.dev — Maskable icon](https://web.dev/articles/maskable-icon)
- [Apple — Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [MDN — Favicon](https://developer.mozilla.org/en-US/docs/Glossary/Favicon)
- [PWA Icos](https://pwaicos.com/)
- [Favicon Builder](https://faviconbuilder.com/)
- [Snappicon](https://www.snappicon.com/)
- [Icon Forge](https://astryke.com/icon-forge/)
- [ConsoleLog Tools — Favicon Generator](https://www.consolelog.tools/tools/favicon-generator)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

## รอบที่ 21 — Image Cropper และการจัดอันดับ Batch 31

สำรวจต่อเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) และตรวจคู่แข่งที่เปิดใช้งานจริง จำนวนคำแนะนำสูงสุด 10 รายการเป็นเพียงสัญญาณความกว้างของ intent ไม่ใช่ search volume และไม่รับประกันอันดับหน้าแรก Google การเลือกงานจึงพิจารณาความครบที่ทำได้ฟรีใน Browser, ความเป็นส่วนตัว, ความเสี่ยง, catalog overlap และโอกาสสร้างหน้าที่ช่วยผู้ใช้จริงร่วมกัน

คะแนน 5 คือสูงที่สุด:

| อันดับ | แนวคิด | สัญญาณ Autocomplete | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | Image Cropper Online | EN 10/10, TH 10/10 | 3 | 5 | 5 | 5 | 3 | ชนะ: ไทยแตกครอป/ตัดรูป/วงกลมชัด และทำ client-only ที่ครบได้โดยไม่เพิ่ม dependency |
| 2 | Resume Builder | EN 10/10, TH 8/10 | 5 | 5 | 5 | 5 | 4 | มูลค่าสูง แต่ต้องทำ ATS semantics, PDF ภาษาไทย, privacy และหลาย template ไม่ควรปล่อยบาง |
| 3 | Favicon / PWA Icon Generator | EN 10/10, TH 2/10 | 3 | 4 | 4 | 4 | 3 | ทำฟรีได้ แต่ต้องสร้าง ICO/PNG/manifest และตรวจไฟล์จริงหลายขนาด |
| 4 | Word Cloud Generator | EN 10/10, TH 3/10 | 4 | 4 | 4 | 4 | 4 | ต้องพิสูจน์การตัดคำไทย stop words ฟอนต์ และ export PNG/SVG |
| 5 | Business Days Calculator | EN 10/10, TH 4/10 | 3 | 4 | 4 | 4 | 3 | ต้อง version ชุดวันหยุดไทยและแยกวันหยุดองค์กรจากวันหยุดราชการ |
| 6 | Remove Image Metadata | EN 10/10, TH 1/10 | 4 | 4 | 4 | 4 | 4 | มี privacy value แต่ต้องตรวจ EXIF/XMP/IPTC หลัง encode จริงทุก format |
| 7 | JSON to CSV Converter | EN 10/10, TH 1/10 | 3 | 4 | 4 | 5 | 2 | demand กว้างแต่ทับเครื่องมือ data เดิม ต้องออกแบบ flatten อย่างโปร่งใส |
| 8 | Password Strength Checker | EN 10/10, TH 0/10 | 2 | 4 | 4 | 4 | 3 | client-only ได้ แต่ห้ามอ้างเวลา crack จากสมมติฐานที่ตรวจไม่ได้ |
| 9 | Color Palette Generator | EN 10/10, TH 0/10 | 3 | 4 | 4 | 4 | 3 | ต้องเพิ่ม contrast, lock color และ export design tokens จึงต่างจาก Color Picker |
| 10 | PDF Compressor | EN/TH 10/10 | 5 | 5 | 5 | 5 | 4 | ยังชะลอ: rasterize ทำลาย text/search/accessibility และไม่รับประกันว่าเล็กลง |
| 11 | Aspect Ratio Calculator | EN 10/10, TH 1/10 | 2 | 4 | 3 | 4 | 2 | ทำง่ายแต่ใกล้ฟังก์ชันใน Image Cropper และความต่างเชิงผลิตภัณฑ์ต่ำ |
| 12 | Online Signature Maker | EN กว้าง, TH 2/10 | 3 | 4 | 4 | 4 | 3 | ทับ Sign PDF และต้องแยกภาพลายเซ็นออกจาก digital certificate ให้ชัด |
| 13 | Character Counter | EN/TH 8–10/10 | 1 | 3 | 3 | 3 | 1 | ทับ Word Counter ควรปรับหน้าเดิมแทนสร้างหน้า keyword ซ้ำ |
| 14 | File Checksum Calculator | EN 10/10, TH 0/10 | 2 | 4 | 3 | 4 | 3 | ควรขยาย Hash Generator เดิมแทนสร้าง thin page |
| 15 | Overtime Estimator | long-tail 1.5/2/3 เท่า | 4 | 4 | 4 | 4 | 3 | ต้องตรวจฐานกฎหมายปัจจุบันและแยกรายวัน/รายเดือนก่อนพัฒนา |

คำตั้งต้น `image cropper`, `crop image online`, `ครอปรูป` และ `ตัดรูป ออนไลน์` ต่างคืนคำแนะนำเต็ม 10 รายการ โดย long-tail ระบุ online, free, circle, by pixel, ratio, PNG/WebP และไม่เสียคุณภาพ ส่วน `ครอปรูป ออนไลน์` แตกเป็นวงกลมและโปรแกรมครอปออนไลน์ ทำให้ scope ที่ตอบ intent จริงต้องมากกว่าการเลือกสี่เหลี่ยม: รองรับ free/1:1/4:3/3:2/16:9/9:16/custom, วงกลม, drag + resize, X/Y/W/H, keyboard movement, rotate/flip, exact output size และ PNG/JPG/WebP

คู่แข่งปัจจุบันอย่าง Pixcircle, UseBoldTools, Circlecropimage, Utilium และ EveryTool ต่างเน้น local processing, circle, ratio, rotate/flip, zoom หรือ exact pixels การส่งมอบจึงใช้การ decode ตาม EXIF orientation, วาดด้วย Canvas `drawImage()`, สร้าง Blob ด้วย `toBlob()` และคืนหน่วยความจำจาก Blob URL เมื่อเปลี่ยนผลลัพธ์ จำกัด input 10 MB / 40 ล้านพิกเซล และ output 8,000 px / 24 ล้านพิกเซลเพื่อไม่ให้ Browser ใช้ RAM สูงโดยไม่มีเพดาน

SEO ใช้ primary intent ที่มองเห็นได้จริงใน H1/คำอธิบาย/ขั้นตอน/FAQ พร้อม long-tail ที่ตรงฟังก์ชัน ไม่สร้างหน้าซ้ำสำหรับ circle cropper หรือ aspect ratio calculator และไม่อ้างรับประกันหน้าแรก Google เพราะอันดับขึ้นกับคู่แข่ง คุณภาพเนื้อหา authority และสัญญาณภายนอกที่ตัวโค้ดควบคุมไม่ได้

- [Google Autocomplete — image cropper](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=image%20cropper)
- [Google Autocomplete — crop image online](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=crop%20image%20online)
- [Google Autocomplete — ครอปรูป](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%A3%E0%B8%AD%E0%B8%9B%E0%B8%A3%E0%B8%B9%E0%B8%9B)
- [Google Autocomplete — ตัดรูป ออนไลน์](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%95%E0%B8%B1%E0%B8%94%E0%B8%A3%E0%B8%B9%E0%B8%9B%20%E0%B8%AD%E0%B8%AD%E0%B8%99%E0%B9%84%E0%B8%A5%E0%B8%99%E0%B9%8C)
- [Pixcircle — Circle Crop Image](https://pixcircle.app/)
- [UseBoldTools — Image Cropper](https://useboldtools.com/image-cropper)
- [Circlecropimage — Circle Crop Image](https://circlecropimage.com/)
- [Utilium — Image Cropper](https://utilium.dev/tools/image-cropper/)
- [EveryTool — Crop Image](https://everytool.solutions/tools/crop-image)
- [MDN — Window.createImageBitmap()](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap)
- [MDN — CanvasRenderingContext2D.drawImage()](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)
- [MDN — HTMLCanvasElement.toBlob()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)

## รอบที่ 20 — HTML Table Generator และการจัดอันดับ Batch 30

สำรวจต่อเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย โดยเทียบคำตั้งต้นภาษาไทยและอังกฤษ รวมทั้ง long-tail ของแต่ละงาน จำนวนคำแนะนำสูงสุด 10 รายการเป็นสัญญาณความกว้างของ intent เท่านั้น ไม่ใช่ search volume และไม่สามารถรับประกันอันดับหน้าแรก Google ได้ การจัดอันดับจึงรวมประโยชน์จริง ความครบที่ทำได้ฟรีใน Browser, ความเสี่ยง, catalog overlap และโอกาสสร้างเนื้อหาที่ช่วยผู้ใช้จริงโดยไม่ยัดคำค้น

คะแนน 5 คือสูงที่สุด คอลัมน์ TH/EN เป็นจำนวนคำแนะนำสูงสุดจาก endpoint ที่ตรวจในรอบนี้:

| อันดับ | แนวคิด | TH/EN | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | HTML Table Generator | 8/10 | 3 | 4 | 4 | 4 | 3 | ชนะ: long-tail ขอ colspan/rowspan, merge cells, CSS, inline CSS และ import จาก Excel ชัดเจน; ทำ semantic editor ที่แตกต่างได้จริง |
| 2 | Resume Builder | 8/10 | 5 | 5 | 5 | 5 | 4 | มูลค่าสูง แต่ต้องทำ ATS semantics, PDF ภาษาไทย, privacy, หลาย template และไม่ล็อก download หลัง login จึงไม่ควรปล่อยเวอร์ชันบาง |
| 3 | Image Cropper | 4/10 | 3 | 5 | 5 | 5 | 3 | อังกฤษกว้างถึง ratio, circle และ pixel; เหมาะ Batch ถัดไปหากทำ rotate, exact size และ export quality ให้ครบ |
| 4 | Favicon / PWA Icon Generator | 2/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ต้องสร้าง ICO, PNG หลายขนาด, manifest และตรวจไฟล์ผลจริง |
| 5 | Word Cloud Generator | 3/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10; ไทยต้องพิสูจน์ tokenization, stop words, ฟอนต์ และ export PNG/SVG |
| 6 | Business Days Calculator | 4/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; วันหยุดไทย ประเทศ และองค์กรต้องใช้ชุดข้อมูล versioned แยกจากการนับเสาร์อาทิตย์ |
| 7 | JSON to CSV Converter | 1/10 | 3 | 4 | 4 | 5 | 2 | อังกฤษ 10/10 แต่ทับกลุ่มข้อมูลเดิม; ต้องให้ผู้ใช้ควบคุม flatten object/array อย่างโปร่งใส |
| 8 | Remove Image Metadata | 1/10 | 4 | 4 | 4 | 4 | 4 | อังกฤษ 10/10 และมี privacy value; ต้องตรวจ EXIF/XMP/IPTC หลัง re-encode ในแต่ละ format จริง |
| 9 | Password Strength Checker | 0/10 | 2 | 4 | 4 | 4 | 3 | อังกฤษ 10/10; ต้อง client-only ใช้คำแนะนำที่อธิบายได้ และไม่อ้างเวลา crack จากสมมติฐานลวง |
| 10 | PDF Compressor | 10/10 | 5 | 5 | 5 | 5 | 4 | demand สูงแต่ชะลอ: rasterize อาจทำลาย text/search/accessibility และไม่รับประกันว่าไฟล์เล็กลง |
| 11 | Color Palette Generator | 0/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษ 10/10 แต่ใกล้ Color Picker เดิม; ต้องมี contrast, lock color และ export tokens เพื่อแตกต่าง |
| 12 | Aspect Ratio Calculator | 1/10 | 2 | 4 | 3 | 4 | 2 | อังกฤษ 10/10 ทำฟรีง่าย แต่ intent ไทยและความต่างเชิงผลิตภัณฑ์ยังต่ำ |
| 13 | File Checksum Calculator | 0/10 | 2 | 4 | 3 | 4 | 3 | อังกฤษ 10/10 แต่ทับ Hash Generator เดิม ควรขยายหน้าปัจจุบันแทนสร้างหน้า keyword ซ้ำ |
| 14 | Online Signature Maker | 2/10 | 3 | 4 | 4 | 4 | 3 | อังกฤษกว้างแต่ทับ Sign PDF และต้องสื่อชัดว่าไฟล์ภาพลายเซ็นไม่ใช่ digital certificate |
| 15 | Character Counter | 8/10 | 1 | 3 | 3 | 3 | 1 | ไทยดีและทำง่าย แต่ฟังก์ชันทับ Word Counter เดิม จึงควรปรับหน้าเดิมแทนสร้าง thin page |

HTML Table Generator ถูกเลือกเพราะตอบ intent สาย developer, content, data และ CMS โดยไม่เพิ่ม dependency หรือส่งข้อมูลขึ้น Server ขอบเขตไม่ใช่เพียง textarea สร้างแท็ก แต่มี visual cell editor, import Excel/Google Sheets/CSV/TSV, เพิ่ม/ลบแถวและคอลัมน์, merge/unmerge ด้วย colspan/rowspan, caption, thead/tbody, scope=col/row/colgroup/rowgroup, CSS + class, inline CSS, semantic HTML, responsive wrapper, Preview, copy และดาวน์โหลดเอกสาร HTML5

การออกแบบยึด W3C Tables Tutorial: ใช้ `th` และ `scope` ระบุความสัมพันธ์, ใช้ `caption` บอกหัวข้อ, ไม่ใช้ table เพื่อจัด Layout และห่อด้วยกรอบเลื่อนแนวนอนเมื่อจอแคบ หัวตารางใน `thead` ไม่อนุญาต rowspan ข้ามเข้า `tbody` ข้อความในเซลล์และ caption ถูก escape ก่อน Preview/Export เพื่อไม่ execute HTML หรือ Script จำกัด 100 แถว, 20 คอลัมน์, 1,000 ตัวอักษรต่อเซลล์ และข้อความนำเข้า 100,000 ตัวอักษรเพื่อรักษาความลื่นของ Browser

แนวทาง SEO ใช้ชื่อหน้าที่กระชับและตรง intent, primary keyword ที่มองเห็นได้, FAQ ที่ตอบข้อจำกัดจริง และเนื้อหา people-first ตาม Google Search Central ไม่สร้างหน้าซ้ำบาง ๆ เพื่อจับคำอย่าง checksum หรือ character counter ที่เครื่องมือเดิมตอบได้อยู่แล้ว และไม่อ้างรับประกันอันดับหน้าแรก

- [Google Autocomplete — HTML Table Generator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=html%20table%20generator)
- [Google Autocomplete — สร้างตาราง HTML](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%95%E0%B8%B2%E0%B8%A3%E0%B8%B2%E0%B8%87%20html)
- [W3C WAI — Tables Tutorial](https://www.w3.org/WAI/tutorials/tables/)
- [W3C WAI — Tables with two headers](https://www.w3.org/WAI/tutorials/tables/two-headers/)
- [W3C WAI — Table Tips](https://www.w3.org/WAI/tutorials/tables/tips/)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central — Title links](https://developers.google.com/search/docs/appearance/title-link)

## รอบที่ 28 — Working Hours Calculator และการจัดอันดับ Batch 38

สำรวจเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) และตรวจหน้าคู่แข่งที่เปิดใช้งานจริง คำอังกฤษ `working hours calculator`, `work hours calculator`, `time card calculator` และ `timesheet calculator` ได้คำแนะนำ 10/10 ทั้งหมด โดย long-tail ระบุ Excel, online, breaks, lunch, decimal, weekly และ two weeks ส่วนคำไทย `คำนวณชั่วโมงทำงาน` ได้ 2/10 และ `คํานวณเวลาทํางาน` ได้ 3/10 พร้อมคำ Excel และออนไลน์ จำนวนคำแนะนำเป็น demand proxy เพื่อดูความกว้างของ intent ไม่ใช่ search volume และไม่รับประกันอันดับ Google

คะแนน 5 คือสูงที่สุด รายการรองที่ยังไม่มีตัวเลข Autocomplete ในรอบนี้ถูกลดคะแนนความมั่นใจแทนการเดาความนิยม:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Working Hours Calculator | EN 10/10 ทุกแกนหลัก; TH 2–3/10 | 3 | 5 | 5 | 5 | 4 | ส่งมอบ Batch 38; แก้โจทย์ clock in/out, break, overnight, rounding, decimal และ CSV โดยไม่ทับหน้า OT |
| 2 | Shift Pattern Planner | ยังไม่ตรวจตัวเลขรอบนี้ | 4 | 5 | 4 | 5 | 4 | มีประโยชน์กับงานกะ แต่ต้องจัดการรอบหมุน วันหยุด และ timezone ให้ชัดเจน |
| 3 | Hourly Rate Calculator | long-tail pay ปรากฏใต้ work hours | 3 | 5 | 5 | 4 | 3 | ควรแยกจากค่าจ้างตามกฎหมายและคำนวณจากรายได้/เวลาที่ผู้ใช้กรอกเท่านั้น |
| 4 | Time Duration Calculator | intent hours and minutes ปรากฏใต้ timesheet | 2 | 4 | 4 | 4 | 2 | ทำง่ายและกว้าง แต่ต้องแตกต่างจาก Date Calculator และ Working Hours ที่มีอยู่ |
| 5 | Billable Hours Calculator | ยังไม่ตรวจตัวเลขรอบนี้ | 3 | 5 | 4 | 5 | 3 | เหมาะฟรีแลนซ์ เอเจนซี และทนาย พร้อม rate หลายงานและ export |
| 6 | Meeting Cost Calculator | ยังไม่ตรวจตัวเลขรอบนี้ | 2 | 4 | 4 | 4 | 4 | เห็นต้นทุนประชุมแบบ real time ได้ แต่ต้องไม่เก็บเงินเดือนรายบุคคล |
| 7 | Break Time Calculator | breaks/lunch ปรากฏต่อเนื่องใน time card/timesheet | 2 | 4 | 4 | 3 | 2 | ควรทำเมื่อมี use case จัดตารางพัก ไม่สร้างหน้า thin ที่ซ้ำกับ Batch 38 |
| 8 | Timesheet Template Generator | Excel ปรากฏทั้ง EN/TH | 3 | 5 | 4 | 4 | 3 | สร้าง XLSX/PDF ได้ แต่ต้องแยก template จากเครื่องคำนวณและกัน formula injection |
| 9 | Payroll Hours Reconciliation | payroll ปรากฏในคู่แข่ง | 4 | 5 | 5 | 5 | 4 | มีมูลค่าสูงแต่ต้องหลีกเลี่ยงการอ้าง compliance และรองรับ import ที่ตรวจสอบได้ |
| 10 | Time Zone Meeting Planner | ยังไม่ตรวจตัวเลขรอบนี้ | 3 | 4 | 4 | 4 | 3 | เหมาะทีม remote แต่ catalog มี Timestamp Converter จึงต้องออกแบบ intent แยก |
| 11 | Invoice Due Date Calculator | ยังไม่ตรวจตัวเลขรอบนี้ | 3 | 4 | 4 | 4 | 3 | ใช้ Business Days engine ได้ แต่ต้องกำหนด endpoint/holiday policy และไม่วินิจฉัยสัญญา |
| 12 | Attendance Percentage Calculator | ยังไม่ตรวจตัวเลขรอบนี้ | 2 | 4 | 3 | 4 | 2 | เหมาะโรงเรียนและ HR แต่ต้องไม่เก็บข้อมูลนักเรียนหรือพนักงานโดยไม่จำเป็น |
| 13 | Mileage & Work Log | ยังไม่ตรวจตัวเลขรอบนี้ | 3 | 4 | 4 | 4 | 3 | ต่อกับ Fuel Cost ได้ แต่ต้องชัดว่าเป็นบันทึกส่วนตัวไม่ใช่เอกสารภาษี |
| 14 | Study Hours Planner | ยังไม่ตรวจตัวเลขรอบนี้ | 2 | 4 | 3 | 4 | 3 | ทำฟรีได้และใช้กับนักเรียน แต่ควรพิสูจน์ demand ก่อนสร้างหน้าใหม่ |
| 15 | Pomodoro / Focus Timer | ยังไม่ตรวจตัวเลขรอบนี้ | 2 | 3 | 3 | 3 | 2 | คู่แข่งสูงและมูลค่า SEO ไม่ชัด จึงไม่ควรแซงเครื่องมือสำนักงานที่แก้ปัญหาจริงกว่า |

ขอบเขต Batch 38 ใช้ `<input type="time">` ซึ่งคืนค่าเป็น `HH:mm` แบบ 24 ชั่วโมงอย่างสม่ำเสมอ แล้วคำนวณเป็นนาทีโดยไม่พึ่ง timezone รองรับหลายกะในวันเดียวกันและถือว่าเวลาออกน้อยกว่าเวลาเข้าคือกะข้ามวัน เวลาเท่ากันถูกปฏิเสธเพื่อไม่เดาว่าเป็น 0 หรือ 24 ชั่วโมง การปัดใช้กับเวลาสุทธิของแต่ละกะหลังหักพักและแสดงผลจริงเทียบผลปัดเสมอ ส่วนเป้าหมายเป็นเพียงการเปรียบเทียบ ไม่เรียกส่วนเกินว่า OT

แนวทาง SEO แยก primary intent `คำนวณชั่วโมงทำงาน` ออกจาก `คำนวณโอที` และ `คำนวณวันทำงาน` ใช้ FAQ ตอบกะข้ามวัน เวลาพัก ชั่วโมงทศนิยม Excel และการปัดโดยไม่สร้างหน้าคำใกล้เคียงหลายหน้าบาง ๆ ฟีเจอร์คู่แข่งที่พบร่วมกันคือหลายวัน หักพัก กะข้ามวัน ผลแบบชั่วโมง:นาที/ทศนิยม และ export ขณะที่ Meaw Tools เพิ่มการเปิดเผย rounding delta, เป้าหมายที่ไม่ตีความเป็น OT, formula-safe CSV และประมวลผลใน Browser

- [Google Autocomplete — working hours calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=working%20hours%20calculator)
- [Google Autocomplete — work hours calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=work%20hours%20calculator)
- [Google Autocomplete — time card calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=time%20card%20calculator)
- [Google Autocomplete — timesheet calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=timesheet%20calculator)
- [Google Autocomplete — คำนวณชั่วโมงทำงาน](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B8%8A%E0%B8%B1%E0%B9%88%E0%B8%A7%E0%B9%82%E0%B8%A1%E0%B8%87%E0%B8%97%E0%B8%B3%E0%B8%87%E0%B8%B2%E0%B8%99)
- [MDN — input type=time](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/time)
- [QuickBooks — Time Card Calculator](https://quickbooks.intuit.com/uk/time-tracking/time-card-calculator/)

## รอบที่ 29 — Shift Pattern Calculator และการจัดอันดับ Batch 39

สำรวจเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) โดยเทียบงานต่อจาก Working Hours Calculator ทั้งภาษาไทยและอังกฤษ จำนวนคำแนะนำสูงสุด 10 รายการเป็นเพียงสัญญาณความกว้างของ intent ไม่ใช่ search volume และไม่รับประกันอันดับหน้าแรก Google คำอังกฤษ `shift pattern calculator`, `shift schedule generator` และ `work schedule generator` ได้ 10/10 ทั้งหมด ส่วน `ตารางกะ` ได้ 10/10 พร้อม long-tail ตารางกะทำงาน, พนักงาน, Excel, 5 หยุด 2 และ 6 หยุด 1 ซึ่งชัดกว่าคำไทยของเครื่องมืออัตราค่าจ้างในรอบเดียวกัน

คะแนน 5 คือสูงที่สุด การเลือกคำนึงถึงประโยชน์จริง ขอบเขตที่ทำฟรีใน Browser ได้ ความเสี่ยง และการไม่สร้างหน้าบางที่ทับเครื่องมือเดิม:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Shift Pattern Calculator | EN 10/10; `ตารางกะ` 10/10 | 4 | 5 | 4 | 5 | 4 | ส่งมอบ Batch 39; รอบซ้ำ, เริ่มกลางรอบ, กะข้ามวัน, calendar, CSV และ ICS |
| 2 | Shift Schedule Generator | EN 10/10 | 5 | 5 | 5 | 5 | 4 | demand กว้าง แต่การจัดหลายพนักงานต้องมี coverage, availability, fairness และ constraints; ไม่ควรแอบอ้างว่า feature รอบซ้ำทำได้ครบ |
| 3 | Work Schedule Generator | EN 10/10; `โปรแกรมจัดตารางงาน` 4/10 | 5 | 5 | 5 | 5 | 4 | intent กว้างเกินกะ ต้องวิจัย persona และงานหลายประเภทก่อน |
| 4 | Hourly Rate Calculator | EN 10/10; ไทย 1/10 | 3 | 5 | 5 | 4 | 3 | น่าทำต่อสำหรับ salary-to-hourly แต่ต้องแยก gross/net และ paid hours ให้ชัด |
| 5 | Time Duration Calculator | EN 10/10 | 2 | 4 | 4 | 4 | 2 | ทำง่ายและมี demand แต่ทับ Date/Working Hours หากไม่มี batch/add/subtract use case ที่ต่างจริง |
| 6 | Meeting Cost Calculator | EN 10/10 | 2 | 4 | 4 | 4 | 4 | เหมาะทีมและธุรกิจ แต่ต้องไม่บันทึกเงินเดือนรายบุคคล |
| 7 | Freelance Hourly Rate Calculator | EN 3/10; ไทย 0/10 | 3 | 5 | 5 | 4 | 4 | value สูงหากรวม utilization, overhead, leave และ tax buffer แต่ demand proxy ยังแคบ |
| 8 | Staff Rota Generator | ปรากฏใต้ shift schedule | 5 | 5 | 5 | 5 | 4 | ต้องมีรายชื่อ, skills, leave, minimum staffing และ audit trail จึงเกินขอบเขต client utility ตอนนี้ |
| 9 | 4 On 4 Off Calendar | long-tail ใต้ shift pattern | 2 | 4 | 4 | 4 | 2 | รวมไว้เป็น Preset ในหน้าเดียว ดีกว่าสร้าง thin page แยก |
| 10 | 2-2-3 Shift Calendar | long-tail คู่แข่งและ pattern มาตรฐาน | 3 | 4 | 4 | 4 | 3 | รวมเป็น Preset ตัวอย่างพร้อมคำเตือนว่าองค์กรอาจกำหนดต่างกัน |
| 11 | Break Roster Planner | ยังไม่พบตัวเลขตรงในรอบนี้ | 4 | 5 | 4 | 5 | 4 | มีประโยชน์กับร้าน/โรงงาน แต่ต้องตรวจ coverage และกฎหมายพัก |
| 12 | On-call Rotation Calendar | intent ใกล้ rotating schedule | 3 | 4 | 4 | 4 | 4 | ต้องรองรับ handoff, escalation และ timezone ก่อนจึงต่างจากตารางกะจริง |
| 13 | Timesheet Template Generator | Excel ปรากฏใต้ `ตารางกะ` | 3 | 4 | 4 | 4 | 2 | CSV จาก Batch 38/39 ตอบบางส่วนแล้ว ควรพิสูจน์ว่าต้องการ template เปล่าจริงก่อน |
| 14 | Attendance Roster | intent ใกล้ HR | 4 | 4 | 4 | 5 | 3 | เกี่ยวกับข้อมูลส่วนบุคคลและประวัติการมาทำงาน จึงต้องออกแบบ privacy มากกว่า utility ปัจจุบัน |
| 15 | Focus / Study Schedule | ยังไม่ตรวจตัวเลขรอบนี้ | 2 | 3 | 3 | 3 | 2 | ใช้ได้กว้างแต่ไม่ควรแซงเครื่องมือสำนักงานที่มี demand ชัดกว่า |

ขอบเขตที่ส่งมอบคือปฏิทิน “รอบกะซ้ำ” สำหรับคน ทีม หรือบทบาทหนึ่งชุด ไม่ใช่ automatic employee rostering ผู้ใช้กำหนดรหัสกะ เวลา พัก วันที่เริ่ม/สิ้นสุด และตำแหน่งวันแรกภายในรอบได้ รองรับช่วงสูงสุด 366 วัน รอบ 56 วัน และกะ 6 ประเภท ใช้เลขวัน UTC ภายใน engine เพื่อไม่ให้ daylight-saving หรือ timezone ของเครื่องเปลี่ยนวันที่ ส่วนไฟล์ ICS ใช้ DTSTART/DTEND แบบ local/floating และ DTEND ของวันหยุดเป็นวันถัดไปตาม semantics แบบ non-inclusive ของ RFC 5545

UI แสดง Preset เป็นตัวอย่าง ไม่อ้างว่าเป็นมาตรฐานบังคับ แยกปฏิทิน สรุป และตารางตรวจทีละวัน พร้อม inner horizontal scroll บนจอเล็กโดยไม่ทำให้ทั้งหน้า overflow การส่งออก CSV ป้องกัน Spreadsheet Formula Injection ในข้อความ และ ICS เลือกรวมวันหยุดได้ ข้อจำกัดระบุชัดว่าไม่ตรวจ availability, leave, minimum coverage, fairness, rest period หรือกฎหมายแรงงาน

แนวทาง SEO ใช้หน้าเดียวตอบ intent หลัก `ตารางกะ` และ `shift pattern calculator` ด้วยเนื้อหาที่ตรงเครื่องมือจริง ไม่แยกหน้า thin สำหรับ 4 on 4 off, 2-2-3, Excel หรือ calendar และไม่อ้างรับประกันอันดับหน้าแรก Google

- [Google Autocomplete — shift pattern calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=shift%20pattern%20calculator)
- [Google Autocomplete — shift schedule generator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=shift%20schedule%20generator)
- [Google Autocomplete — work schedule generator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=work%20schedule%20generator)
- [Google Autocomplete — ตารางกะ](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%95%E0%B8%B2%E0%B8%A3%E0%B8%B2%E0%B8%87%E0%B8%81%E0%B8%B0)
- [RFC 5545 — Internet Calendaring and Scheduling Core Object Specification](https://www.rfc-editor.org/rfc/rfc5545)
- [MDN — input type=date](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/date)
- [Shifty — Shift Pattern Generator](https://shifty.ldcoda.com/)

## รอบที่ 30 — Hourly Rate Calculator และการจัดอันดับ Batch 40

สำรวจเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) หลังส่งมอบเครื่องมือตารางกะ โดยเทียบ 16 คำตั้งต้นสายรายได้ ฟรีแลนซ์ ที่ปรึกษา ชั่วโมงขายได้ และต้นทุนประชุม จำนวนคำแนะนำสูงสุด 10 รายการเป็น demand proxy เพื่อดูความกว้างของ intent ไม่ใช่ search volume และไม่รับประกันอันดับหน้าแรก Google

คำอังกฤษ `hourly rate calculator`, `salary to hourly calculator`, `annual salary to hourly calculator`, `meeting cost calculator`, `billable hours calculator`, `day rate calculator` และ `overtime rate calculator` ได้ 10/10 ทั้งหมด ส่วน `คำนวณค่าแรง` ได้ 9/10 พร้อม long-tail รายวัน รายเดือน รายชั่วโมง OT, Excel, รปภ. และก่อสร้าง ขณะที่ `freelance hourly rate calculator` ได้ 3/10, `consulting rate calculator` 4/10 และคำไทยเฉพาะเรทฟรีแลนซ์ยังไม่เกิดคำแนะนำ

คะแนน 5 คือสูงที่สุด การเลือกคำนึงถึง demand, ประโยชน์ข้ามสายงาน, catalog overlap, ความเสี่ยง และความครบที่ทำฟรีใน Browser ได้:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Hourly Rate Calculator | EN 10/10; `คำนวณค่าแรง` 9/10 | 3 | 5 | 5 | 5 | 4 | ส่งมอบ Batch 40; 5 pay periods, work capacity, bonus, freelance target, fee gross-up, project quote และ CSV |
| 2 | Salary to Hourly Calculator | EN 10/10 | 2 | 5 | 5 | 4 | 3 | รวมเป็นโหมดแรกในหน้าเดียวเพื่อไม่สร้าง thin page ใกล้กัน |
| 3 | Annual Salary to Hourly Calculator | EN 10/10 | 2 | 5 | 4 | 4 | 2 | รวมใน pay-period selector พร้อมโบนัสและสัปดาห์ทำงานที่ผู้ใช้กำหนด |
| 4 | Billable Hours Calculator | EN 10/10 และมี Excel/6-minute/lawyer | 3 | 5 | 5 | 5 | 4 | น่าทำต่อ แต่ต้องแยก time log/rounding/target จาก Working Hours และ Hourly Rate ให้ชัด |
| 5 | Meeting Cost Calculator | EN 10/10 พร้อม live/Teams/Outlook | 3 | 5 | 4 | 5 | 5 | มีผลต่อพฤติกรรมองค์กร แต่ต้องออกแบบ privacy และไม่แสดงเงินเดือนรายบุคคล |
| 6 | Day Rate Calculator | EN 10/10 | 2 | 4 | 4 | 4 | 2 | รวม Day rate ในผลฟรีแลนซ์แทนหน้าแยกบาง |
| 7 | Freelance Hourly Rate Calculator | EN 3/10 | 3 | 5 | 5 | 5 | 4 | รวมเป็นโหมดสอง เพราะเพิ่มคุณค่าจริงแม้ primary demand แคบกว่า salary conversion |
| 8 | Consulting Rate Calculator | EN 4/10 | 3 | 5 | 5 | 4 | 4 | สูตรใกล้ฟรีแลนซ์มาก ควรเพิ่ม template อุตสาหกรรมภายหลังแทน duplicate page |
| 9 | Project Rate Calculator | EN 5/10 แต่ suggestion ส่วนใหญ่เป็น burn/return/loan | 3 | 4 | 4 | 4 | 3 | intent ไม่บริสุทธิ์ จึงใส่ project quote เป็นผลรอง ไม่ใช้ primary keyword |
| 10 | Overtime Rate Calculator | EN 10/10; ไทยอยู่ใต้ `คำนวณค่าแรง` | 4 | 5 | 5 | 4 | 3 | มีหน้า Overtime Thailand พร้อมกฎหมายและตัวคูณอยู่แล้ว ไม่สร้างหน้าซ้ำ |
| 11 | Wage Calculator Thailand | ไทยมีรายวัน/เดือน/ชั่วโมง | 5 | 5 | 5 | 5 | 3 | ต้องมี minimum wage รายจังหวัด/อาชีพแบบ versioned และแหล่งราชการก่อนเปิด |
| 12 | Contractor vs Employee Comparison | ปรากฏใน intent salary/day rate | 5 | 5 | 5 | 5 | 4 | ต้องเทียบ benefits, tax, leave และ risk อย่าง country-specific จึงยังไม่ควรเดา |
| 13 | Platform Fee Calculator | fee เป็น feature คู่แข่งฟรีแลนซ์ | 2 | 4 | 4 | 4 | 3 | รวม gross-up ใน Batch 40; ไม่สร้างหน้าแยกจนกว่าจะมีหลาย platform/scenario |
| 14 | Break-even Utilization Calculator | billable/non-billable เป็น pain point ชัด | 3 | 4 | 4 | 5 | 4 | เหมาะต่อยอด dashboard แต่ต้องมี time log จริงเพื่อพิสูจน์ utilization |
| 15 | Quote Profit Checker | ต่อกับ Quotation/Profit Margin | 3 | 5 | 5 | 5 | 4 | ควรออกแบบเป็นการตรวจใบเสนอราคา ไม่ซ้อน project quote แบบง่ายใน Batch 40 |

Batch 40 แยกความหมายสองโหมดชัดเจน โหมดค่าจ้าง annualize งวดรายชั่วโมง/วัน/สัปดาห์/เดือน/ปี บวกโบนัส แล้วหารด้วยชั่วโมงหรือวันทำงานตามสมมติฐานของผู้ใช้ โหมดฟรีแลนซ์ใช้สูตร `(รายได้ส่วนตัวเป้าหมาย + ต้นทุนธุรกิจ + เงินสำรอง) × (1 + buffer) ÷ (1 - fee) ÷ annual billable hours` โดยไม่เดาภาษี ไม่ใช้ benchmark รายอาชีพ และไม่เรียกผลว่า “ราคาตลาด”

การชดเชยค่าธรรมเนียมใช้ gross-up ด้วยการหาร `1 - fee` แทนการบวกเปอร์เซ็นต์ตรง ๆ เช่น ต้องเหลือ 90,000 หลังหัก 10% ต้องเรียกเก็บ 100,000 ส่วนการปัดเรททำได้เฉพาะปัดขึ้นและแสดงค่าก่อนปัดเสมอ Project quote ใช้เรทหลังปัดคูณชั่วโมง แล้ว gross-up ค่าใช้จ่ายตรงตาม fee โดยระบุว่าไม่รวม VAT, scope change, revision, term ชำระ หรือความเสี่ยงเฉพาะงาน

UI ใช้ 2 Tabs เพื่อไม่ปะปนโจทย์พนักงานกับฟรีแลนซ์ ทุก label เว้นจาก input อย่างสม่ำเสมอ ผลลัพธ์มีสูตรและ breakdown ที่ตรวจย้อนกลับได้ รองรับ THB/USD/EUR/GBP/JPY เฉพาะการแสดงหน่วยโดยไม่แปลง exchange rate และสร้าง CSV ใน Browser หน้า SEO ใช้ primary intent `hourly rate calculator` กับ `คำนวณค่าแรงรายชั่วโมง` พร้อม FAQ แยก OT, tax, billable time, fee และ project quote โดยไม่สร้างหน้า keyword ใกล้เคียงหลายหน้า

- [Google Autocomplete — hourly rate calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=hourly%20rate%20calculator)
- [Google Autocomplete — salary to hourly calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=salary%20to%20hourly%20calculator)
- [Google Autocomplete — billable hours calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=billable%20hours%20calculator)
- [Google Autocomplete — คำนวณค่าแรง](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B8%84%E0%B9%88%E0%B8%B2%E0%B9%81%E0%B8%A3%E0%B8%87)
- [Pearson — Annual Income Calculator](https://www.pearson.com/channels/calculators/annual-income-calculator)
- [RateCalc — Freelance Hourly Rate Calculator](https://www.ratecalc.app/)
- [Everhour — Calculate freelance hourly rate](https://everhour.com/calculators/calculate-freelance-hourly-rate)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

## รอบที่ 31 — Meeting Cost Calculator และการจัดอันดับ Batch 41

สำรวจเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) หลังส่งมอบ Hourly Rate Calculator โดยเทียบ 16 คำตั้งต้นด้านต้นทุนประชุม ตัวจับเวลา ชั่วโมงขายได้ utilization และต้นทุนพนักงาน จำนวนคำแนะนำสูงสุด 10 รายการเป็น demand proxy ของความกว้าง intent ไม่ใช่ search volume และไม่รับประกันอันดับหน้าแรก Google

คำอังกฤษ `meeting cost calculator`, `meeting timer`, `billable hours calculator`, `utilization calculator`, `employee cost calculator`, `labor cost calculator`, `project cost calculator` และ `break even calculator` ได้ 10/10 ขณะที่ `cost of meeting calculator` ได้ 4/10, `meeting agenda timer` และ `cost per hire calculator` ได้ 3/10, `meeting roi calculator` ได้ 1/10 ส่วนคำไทย `คำนวณต้นทุนประชุม`, `คำนวณค่าใช้จ่ายประชุม`, `จับเวลาประชุม` และ `คำนวณต้นทุนพนักงาน` ยังไม่เกิดคำแนะนำ จึงใช้ชื่ออังกฤษเป็น primary intent และอธิบายภาษาไทยให้ตรงงานจริงโดยไม่สร้างหลายหน้าบาง

คะแนน 5 คือสูงที่สุด การเลือกคำนึงถึง demand, ประโยชน์ข้ามสายงาน, ความต่างจาก catalog เดิม, privacy, ความเสี่ยงจากการตีความตัวเลข และความครบที่ทำฟรีใน Browser ได้:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Meeting Cost Calculator | EN 10/10 พร้อม Outlook/Teams/live/free | 3 | 5 | 4 | 5 | 5 | ส่งมอบ Batch 41; กลุ่มบทบาท, 3 pay periods, overhead, direct cost, recurrence, shorter scenario, live timer และ CSV |
| 2 | Meeting Timer | EN 10/10 พร้อม Teams/Google Meet/Zoom/online | 2 | 5 | 4 | 4 | 4 | รวมตัวจับเวลาแบบ start/pause/resume/reset ในหน้าเดียว เพื่อไม่สร้าง timer บางที่ไม่มี cost context |
| 3 | Billable Hours Calculator | EN 10/10 พร้อม 6-minute/Excel/lawyer/annual target | 3 | 5 | 5 | 5 | 4 | ตัวเลือก Batch ถัดไป ต้องแยก time log, rounding และ target จาก Working Hours/Hourly Rate ให้ชัด |
| 4 | Employee Cost Calculator | EN 10/10 แต่ long-tail เป็นรายประเทศ/ปี | 5 | 5 | 5 | 5 | 3 | ต้องมี payroll tax, benefits และกฎ versioned รายประเทศ จึงไม่ควรเดาจากเงินเดือนอย่างเดียว |
| 5 | Labor Cost Calculator | EN 10/10 พร้อม Excel/ก่อสร้าง/ร้านอาหาร/โรงงาน | 4 | 5 | 5 | 5 | 3 | intent กว้างและต่างสูตรตามอุตสาหกรรม ควรวิจัย persona ก่อนสร้างหน้าเดียวที่กว้างเกินไป |
| 6 | Project Cost Calculator | EN 10/10 แต่ปะปน solar/game/construction/craft | 4 | 5 | 5 | 5 | 3 | primary intent ไม่บริสุทธิ์ ควรทำ project-specific template หรือ Quote Profit Checker แทนหน้า generic |
| 7 | Utilization Calculator | EN 10/10 แต่ปะปน credit/CPU/container | 3 | 5 | 5 | 5 | 4 | ควรใช้คำ Billable Utilization เป็นหลักและมี denominator policy ชัดเจน |
| 8 | Cost of Meeting Calculator | EN 4/10 | 2 | 5 | 4 | 4 | 3 | รวมเป็น secondary keyword และ FAQ ใน Batch 41 แทน duplicate page |
| 9 | Cost per Hire Calculator | EN 3/10 พร้อม Excel/ความหมาย | 4 | 5 | 5 | 5 | 4 | ต้องกำหนด scope ค่าโฆษณา เวลา recruiter agency onboarding และช่วงเวลารายงานก่อน |
| 10 | Meeting Agenda Timer | EN 3/10 | 3 | 4 | 3 | 4 | 4 | live timer ปัจจุบันตอบเวลารวม; agenda item timer ควรเพิ่มเมื่อมีหลักฐาน demand ไทยหรือ usage จริง |
| 11 | Meeting ROI Calculator | EN 1/10 | 5 | 4 | 4 | 4 | 5 | ไม่ส่งมอบ เพราะ outcome และคุณค่าการตัดสินใจวัดอัตโนมัติไม่ได้ ต้นทุนอย่างเดียวไม่ใช่ ROI |
| 12 | Recurring Meeting Cost | ปรากฏเป็น feature คู่แข่ง | 2 | 5 | 4 | 5 | 3 | รวม meetings/week × weeks/year และแสดงรายเดือน/ปีใน Batch 41 |
| 13 | Shorter Meeting Savings | ปรากฏใน pain point ลดเวลา | 2 | 5 | 4 | 4 | 4 | รวม scenario ลดนาที โดยลดเฉพาะ loaded labor ไม่เดาว่าค่าใช้จ่ายตรงลดตาม |
| 14 | Live Meeting Cost Counter | long-tail ใต้ meeting cost/timer | 3 | 5 | 4 | 5 | 5 | รวมต้นทุนสดพร้อม planned-time progress และ fixed direct cost ที่อธิบายชัด |
| 15 | Break-even Calculator | EN 10/10 แต่ปะปน mortgage/pension/social security | 3 | 4 | 5 | 5 | 2 | intent กว้างเกินไป ควรทำ Break-even Business ที่มี fixed/variable cost และ volume ชัดในรอบเฉพาะ |

สูตร Batch 41 แปลงรายเดือนเป็น `(ค่าจ้างต่อเดือน × 12) ÷ (ชั่วโมงต่อสัปดาห์ × สัปดาห์ทำงานต่อปี)` และรายปีเป็น `ค่าจ้างต่อปี ÷ ชั่วโมงทำงานต่อปี` จากนั้นรวม `เรทรายชั่วโมง × จำนวนคน × ระยะเวลาประชุม` ของแต่ละกลุ่ม เพิ่ม overhead ที่ผู้ใช้กำหนดและค่าใช้จ่ายตรงต่อครั้ง ต้นทุนรายปีใช้ `ต้นทุนต่อครั้ง × ครั้งต่อสัปดาห์ × สัปดาห์ที่ประชุมต่อปี` โดยไม่ใช้ loaded-rate มาตรฐานตายตัว

การประหยัดจากการลดเวลาคิดเฉพาะ `ต้นทุนทีมต่อชั่วโมงหลัง overhead × นาทีที่ลด ÷ 60` ไม่ลดค่าห้อง อาหาร เดินทาง หรือวิทยากรโดยอัตโนมัติ Live timer ใช้เรทผลล่าสุดและเพิ่มต้นทุนแรงงานตามเวลาจริง ขณะที่ direct cost เป็นยอดคงที่หนึ่งครั้ง จึงอาจเริ่มสูงกว่าศูนย์เมื่อกรอกค่าใช้จ่ายตรง

UI ใช้กลุ่มบทบาทแทนชื่อบุคคล จำกัด 20 กลุ่ม ทุก label เว้นจาก input อย่างสม่ำเสมอ ตาราง breakdown เลื่อนภายในบนจอเล็กโดยไม่ทำให้ทั้งหน้า overflow รองรับ THB/USD/EUR/GBP/JPY เฉพาะหน่วยโดยไม่แปลง exchange rate และสร้าง CSV ใน Browser หน้า SEO รวม intent `meeting cost calculator`, `cost of meeting calculator`, `meeting timer` และคำอธิบายไทยไว้หน้าเดียว พร้อม FAQ แยก privacy, pay-period conversion, overhead, direct cost, recurrence, timer และข้อจำกัด Meeting ROI

- [Google Autocomplete — meeting cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=meeting%20cost%20calculator)
- [Google Autocomplete — meeting timer](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=meeting%20timer)
- [Google Autocomplete — billable hours calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=billable%20hours%20calculator)
- [Google Autocomplete — employee cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=employee%20cost%20calculator)
- [Google Autocomplete — labor cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=labor%20cost%20calculator)
- [Meeting Toll — Meeting Cost Calculator](https://www.meetingtoll.com/tools/meeting-cost-calculator)
- [Calwise — Meeting Cost Calculator & Analytics](https://calwise.io/)
- [U.S. DHS — Meeting Cost Estimator](https://www.dhs.gov/sites/default/files/publications/MeetingCostEstimatorForm508rb.pdf)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

## รอบที่ 32 — Billable Hours Calculator และการจัดอันดับ Batch 42

สำรวจเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) หลังส่งมอบ Meeting Cost Calculator โดยเทียบ 16 คำตั้งต้นด้าน Billable time, time tracking, utilization, invoicing และ project profitability จำนวนคำแนะนำสูงสุด 10 รายการเป็นเพียง demand proxy ของความกว้าง intent ไม่ใช่ search volume และไม่รับประกันอันดับหน้าแรก Google

คำอังกฤษ `billable hours calculator`, `billable hours tracker` และ `billable hours chart` ได้ 10/10 ทั้งหมด โดยคำหลักแตกเป็น `6 minute increments`, Excel, lawyer, free, annual และ target อย่างชัดเจน `utilization calculator` ได้ 10/10 แต่ intent ปะปน credit, CPU, container และ bandwidth, `capacity planning calculator` ได้ 8/10 แต่ปะปนระบบไอที, `project profitability calculator` ได้ 3/10, `time billing calculator` 2/10 และ `billable utilization calculator`, `effective hourly rate calculator`, `invoice hours calculator` ได้ 1/10 ส่วน `agency utilization calculator`, `freelance utilization calculator`, `revenue gap calculator`, `คำนวณชั่วโมงคิดเงิน` และ `คำนวณชั่วโมง billable` ยังไม่เกิดคำแนะนำ จึงใช้ชื่ออังกฤษเป็น primary intent และอธิบายไทยในหน้าเดียว

คะแนน 5 คือสูงที่สุด การเลือกคำนึงถึง demand, ประโยชน์ข้ามฟรีแลนซ์ เอเจนซี ที่ปรึกษา นักบัญชี และงานกฎหมาย, ความต่างจาก Working Hours/Hourly Rate, privacy ของ time log, ความโปร่งใสในการปัดเวลา และศักยภาพ AdSense จาก intent งานธุรกิจ:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Billable Hours Calculator | EN 10/10; 6-minute/Excel/lawyer/annual/target | 3 | 5 | 5 | 5 | 4 | ส่งมอบ Batch 42; time log, per-entry rounding, utilization, target/revenue gap, annual projection และ CSV |
| 2 | Billable Hours Tracker | EN 10/10; Excel/free/template/app | 4 | 5 | 5 | 5 | 4 | รวม manual time log ใน Batch 42; timer, persistence และหลายลูกค้าควรเป็น app phase เมื่อมี consent/storage design |
| 3 | Billable Hours Chart | EN 10/10; conversion/.1/legal | 2 | 5 | 4 | 4 | 3 | รวมตารางตามรอบ 1/6/10/15/30/60 นาทีในหน้าเดียว ไม่สร้างหน้า chart บาง |
| 4 | Billable Utilization Calculator | EN 1/10 แต่ pain point ชัด | 3 | 5 | 5 | 5 | 4 | รวมสูตรเวลาจริง ÷ capacity พร้อม denominator policy และผลเกิน 100% ใน Batch 42 |
| 5 | Project Profitability Calculator | EN 3/10 พร้อม Excel | 4 | 5 | 5 | 5 | 4 | ตัวเลือก Batch ถัดไป; ต้องรวม quoted revenue, labor cost, direct cost, scope change และ margin โดยไม่ซ้ำ Profit Margin |
| 6 | Capacity Planning Calculator | EN 8/10 แต่ปะปน Kafka/Splunk/SQL | 4 | 5 | 5 | 5 | 4 | ควรระบุ Agency/Team Capacity และรองรับหลายบทบาท ไม่ใช้ keyword กว้างอย่างเดียว |
| 7 | Time Billing Calculator | EN 2/10 พร้อม legal | 2 | 5 | 4 | 4 | 3 | intent หลักตอบแล้วด้วย rate × rounded billable time ใน Batch 42 |
| 8 | Invoice Hours Calculator | EN 1/10 | 3 | 5 | 5 | 4 | 3 | ควรเชื่อม Quotation/Invoice workflow ในอนาคต ไม่สร้างหน้า duplicate ตอนนี้ |
| 9 | Effective Hourly Rate Calculator | EN 1/10 | 2 | 5 | 5 | 4 | 4 | รวมรายรับหลังปัด ÷ เวลาที่ลงทั้งหมดใน Batch 42 พร้อมระบุว่าไม่ใช่กำไรสุทธิ |
| 10 | Annual Billable Hours Target | long-tail ใต้คำหลัก | 2 | 5 | 5 | 4 | 3 | รวม rounds/year, target hours และ annual revenue gap ใน Batch 42 |
| 11 | Employee Cost Calculator | EN 10/10 จากรอบ 31 แต่ country-specific | 5 | 5 | 5 | 5 | 3 | ต้อง version payroll tax, benefits และกฎไทยก่อน ไม่ควรเดาตัวคูณ loaded cost |
| 12 | Labor Cost Calculator | EN 10/10 จากรอบ 31 แต่หลายอุตสาหกรรม | 4 | 5 | 5 | 5 | 3 | ควรเลือก template ก่อสร้าง ร้านอาหาร หรือโรงงานจาก intent เพิ่มเติม |
| 13 | Cost per Hire Calculator | EN 3/10 | 4 | 5 | 5 | 5 | 4 | ต้องกำหนดช่วงรายงานและ scope ค่าโฆษณา recruiter agency interview และ onboarding |
| 14 | Quote Profit Checker | ต่อจาก Quotation และ time log | 3 | 5 | 5 | 5 | 4 | ใช้ตรวจราคาที่เสนอเทียบต้นทุนจริง เหมาะรวมกับ Project Profitability ในรอบเฉพาะ |
| 15 | Business Break-even Calculator | keyword กว้าง 10/10 แต่ intent ปะปน | 3 | 5 | 5 | 5 | 3 | ทำได้เมื่อระบุ fixed cost, variable cost และ unit economics ชัด ไม่ทำหน้า generic ที่ชน mortgage/pension |

Batch 42 แยก “เวลาจริง” ออกจาก “เวลาออกบิล” อย่างเคร่งครัด รายการ Billable แต่ละรายการใช้ `ceil(เวลาจริง ÷ รอบปัด) × รอบปัด` ขณะที่ Non-billable ไม่ถูกปัดและไม่มีมูลค่าออกบิล ตัวอย่าง 3 นาทีสองรายการในรอบ 6 นาทีจึงออกบิล 12 นาที ไม่ใช่ 6 นาทีจากการรวมก่อนปัด และระบบแสดงส่วนเพิ่มจากการปัดทั้งนาทีและเงิน

Billable utilization ใช้ `นาที Billable จริงก่อนปัด ÷ (ชั่วโมงฐาน × 60) × 100` ไม่ใช้เวลาออกบิลหลังปัดและไม่ใช้เวลาที่ลงรวมเป็นตัวหาร เป้าหมายใช้ตัวหารเดียวกัน ช่องว่างรายรับต่อปีเป็น `max(0, นาทีเป้าหมาย - นาที Billable จริง) ÷ 60 × เรท × จำนวนรอบต่อปี` จึงไม่ติดลบเมื่อเกินเป้า ส่วน Effective Hourly Rate เป็นรายรับหลังปัดหารเวลาที่ลงทั้งหมดและไม่เรียกว่ากำไรสุทธิ

UI ใช้รายการงานทั่วไปแทนชื่อลูกค้าลับ จำกัด 50 รายการ ชั่วโมง/นาทีเป็นช่องแยกที่ label เว้นจาก input อย่างสม่ำเสมอ ตาราง breakdown เลื่อนภายในจอเล็กโดยไม่ทำให้หน้า overflow รองรับ THB/USD/EUR/GBP/JPY เฉพาะหน่วยโดยไม่แปลง exchange rate และ CSV มี UTF-8 BOM กับ Formula Injection protection หน้า SEO รวม intent calculator, tracker, chart, 6-minute, Excel, lawyer, annual, target และ utilization ไว้หน้าเดียวพร้อม FAQ โดยไม่สร้าง doorway pages

- [Google Autocomplete — billable hours calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=billable%20hours%20calculator)
- [Google Autocomplete — billable hours tracker](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=billable%20hours%20tracker)
- [Google Autocomplete — billable hours chart](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=billable%20hours%20chart)
- [Google Autocomplete — utilization calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=utilization%20calculator)
- [Google Autocomplete — project profitability calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=project%20profitability%20calculator)
- [Hour Cap — Billable Utilization Calculator](https://hourcap.com/free-tools/billable-utilization-calculator)
- [Everhour — Billable Utilization Calculator](https://everhour.com/calculators/billable-utilization-calculator)
- [Corcava — Billable Hours Calculator](https://corcava.com/tools/billable-hours-calculator)
- [Productive — Billable Hours Calculator](https://productive.io/billable-hours-calculator/)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

## รอบที่ 33 — Project Cost & Profit Calculator และการจัดอันดับ Batch 43

สำรวจเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) หลังส่งมอบ Billable Hours Calculator โดยเทียบ 27 คำตั้งต้นด้าน project cost, profitability, job costing, pricing, break-even และ capacity จำนวนคำแนะนำสูงสุด 10 รายการใช้เป็น demand proxy เพื่อดูความกว้างของ intent เท่านั้น ไม่ใช่ search volume และไม่รับประกันอันดับหน้าแรก Google

`project cost calculator`, `job cost calculator`, `labor cost calculator`, `break even calculator` และ `markup calculator` ได้ 10/10 แต่ `job cost` และ `break even` ปะปนงานเฉพาะทางหลายชนิด ขณะที่ `project profitability calculator` ได้ 3/10 พร้อม long-tail Excel, `project profit calculator` 2/10, `job costing calculator` 3/10, `project budget calculator` 2/10, `project ROI calculator` 5/10 และ `team capacity calculator` 6/10 คำไทย `คำนวณกำไรโครงการ`, `คำนวณต้นทุนโครงการ`, `คำนวณงบโครงการ` และ `คำนวณราคางาน` ยังไม่เกิดคำแนะนำในรอบนี้ จึงใช้ชื่ออังกฤษที่ตรง intent เป็นชื่อหลักและอธิบายไทยอย่างครบถ้วนในหน้าเดียว

คะแนน 5 คือสูงที่สุด การเลือกคำนึงถึง demand, ประโยชน์ข้ามฟรีแลนซ์ เอเจนซี ที่ปรึกษา ทีมโครงการ และ SME, ความต่างจาก Profit Margin/Quotation เดิม, ความโปร่งใสของ Forecast และศักยภาพรายได้จาก intent งานธุรกิจ:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Project Cost & Profit Calculator | Project cost 10/10; profitability 3/10; profit 2/10 | 4 | 5 | 5 | 5 | 4 | ส่งมอบ Batch 43; Budget vs Actual + Remaining, labor/direct/overhead, Forecast profit, margin, target และ CSV |
| 2 | Labor Cost Calculator | EN 10/10 พร้อม Excel/ก่อสร้าง/ร้านอาหาร/โรงงาน | 4 | 5 | 5 | 5 | 3 | demand สูงแต่ intent ต่างตามอุตสาหกรรม ควรเลือก persona จาก Search Console ก่อนสร้างสูตรกว้าง |
| 3 | Business Break-even Calculator | คำกว้าง 10/10 พร้อม business/online | 3 | 5 | 5 | 5 | 3 | ต้องระบุ fixed cost, variable cost และหน่วยขายให้ชัดเพื่อไม่ชน mortgage/pension |
| 4 | Markup Calculator | EN 10/10 พร้อม Excel/percentage/formula | 2 | 4 | 5 | 4 | 2 | ทับ Profit & Margin Calculator เดิม ควรขยายหน้าเดิมแทนสร้างหน้า keyword ซ้ำ |
| 5 | Team Capacity Calculator | EN 6/10 พร้อม Excel/Agile/Scrum/Sprint | 4 | 5 | 5 | 5 | 4 | เหมาะ Batch ถัดไปเมื่อกำหนด availability, leave, focus factor และ role demand ให้ชัด |
| 6 | Project ROI Calculator | EN 5/10 พร้อม Excel/management | 4 | 5 | 5 | 5 | 3 | ต้องแยก financial ROI จาก project success และไม่เดามูลค่าผลลัพธ์ที่วัดไม่ได้ |
| 7 | Job Costing Calculator | EN 3/10 พร้อม job order costing | 4 | 5 | 5 | 5 | 4 | intent บัญชีตอบบางส่วนใน Batch 43 ผ่าน labor, direct cost, overhead และ cost variance |
| 8 | Cost-plus Pricing Calculator | EN 3/10 พร้อม formula | 3 | 5 | 5 | 4 | 3 | เหมาะตั้งราคาก่อนเสนอ แต่ต้องแยก Margin กับ Markup และค่าธรรมเนียมให้ชัด |
| 9 | Project Profitability Calculator | EN 3/10 พร้อม Excel | 4 | 5 | 5 | 5 | 4 | รวมเป็น secondary intent ของ Batch 43 ไม่สร้างหน้าซ้ำกับ Project Cost |
| 10 | Project Budget Calculator | EN 2/10 | 3 | 5 | 4 | 5 | 3 | Budget อย่างเดียวบางเกินไป จึงรวมการติดตาม Actual + Remaining ในหน้า Batch 43 |
| 11 | Project Margin Calculator | EN 2/10 | 2 | 4 | 4 | 4 | 2 | รวม Margin ตามแผนและ Forecast ใน Batch 43 แทนหน้าสูตรเดี่ยว |
| 12 | Resource Capacity Calculator | EN 2/10 และปะปนระบบคอมพิวเตอร์ | 4 | 5 | 4 | 5 | 4 | ต้องใช้คำ Team/Agency Capacity เพื่อแยกจาก YARN และ cloud infrastructure |
| 13 | Project Revenue Calculator | EN 2/10 | 3 | 4 | 4 | 4 | 2 | รายรับอย่างเดียวไม่สะท้อนกำไร จึงรวม base revenue กับ approved changes ใน Batch 43 |
| 14 | Client Profitability Calculator | EN 0/10 ใน locale นี้ | 4 | 5 | 5 | 5 | 4 | ต้องรองรับหลาย project และ shared acquisition/support cost จึงเป็น product phase มากกว่าหน้าเดี่ยว |
| 15 | Quote Profit Calculator | EN 0/10 | 3 | 5 | 5 | 4 | 3 | เชื่อม use case ผ่าน Project Cost ไป Quotation และ Hourly Rate โดยไม่สร้าง doorway page |

Batch 43 นิยาม Forecast cost เป็น `Actual cost + Remaining cost` ตามแนวคิด Estimate to Complete โดยแยกแรงงาน ต้นทุนตรง และ Overhead ชัดเจน ต้นทุนแรงงานต่อบทบาทใช้ `ชั่วโมง × ต้นทุนภายในต่อชั่วโมง` และส่วนต่างต้นทุนเป็น `Forecast - Budget` ค่าบวกจึงหมายถึงคาดว่าจะเกินงบ ไม่ใช้เปอร์เซ็นต์ความคืบหน้าหาร Actual เพราะ burn rate อาจไม่สม่ำเสมอและทำให้ปลายโครงการคลาดเคลื่อน

รายรับปัจจุบันเป็น `สัญญาเดิม + งานเพิ่มที่อนุมัติแล้ว` กำไร Forecast เป็น `รายรับปัจจุบัน - Forecast cost` และ Margin เป็น `กำไร ÷ รายรับ × 100` รายรับขั้นต่ำเพื่อถึง Target margin เป็น `Forecast cost ÷ (1 - Target margin)` โดยหน้าจอแสดงส่วนที่ยังขาดจากรายรับปัจจุบันและเตือนว่าสูตรสมมติว่าต้นทุนไม่เพิ่มตามงานใหม่ ไม่คำนวณ Earned Value, CPI, SPI หรือการรับรู้รายได้ตามมาตรฐานบัญชี

UI ใช้การ์ด responsive สำหรับข้อมูลหลายบทบาทและต้นทุน แยก Budget/Actual/Remaining ด้วย label ห่างจาก input อย่างสม่ำเสมอ ตารางเปรียบเทียบเลื่อนภายในจอเล็กโดยไม่ทำให้ทั้งหน้า overflow รองรับ THB/USD/EUR/GBP/JPY เฉพาะหน่วยโดยไม่แปลง exchange rate และ CSV มี UTF-8 BOM กับ Formula Injection protection หน้า SEO รวม project cost, profitability, job costing, budget, margin และ Excel intent ไว้หน้าเดียวตาม people-first content แทนการสร้างหน้าคล้ายกันจำนวนมาก

- [Google Autocomplete — project cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=project%20cost%20calculator)
- [Google Autocomplete — project profitability calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=project%20profitability%20calculator)
- [Google Autocomplete — job costing calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=job%20costing%20calculator)
- [Google Autocomplete — labor cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=labor%20cost%20calculator)
- [Microsoft Learn — Key concepts in project budget management](https://learn.microsoft.com/en-us/dynamics365/project-operations/pro/budget/keyconcepts-projectbudget)
- [Oracle — Project Planning and Control User Guide](https://docs.oracle.com/cd/E26401_01/doc.122/e49016/T185673T185678.htm)
- [OpenStax — Job Order Costing](https://openstax.org/books/principles-managerial-accounting/pages/4-1-distinguish-between-job-order-costing-and-process-costing)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

## รอบที่ 34 — Team Capacity & Workload Calculator และการจัดอันดับ Batch 44

สำรวจเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) หลังส่งมอบ Project Cost & Profit Calculator โดยเทียบ 34 คำตั้งต้นด้าน capacity, workload, FTE, labor cost, break-even, cash flow, ROI, commission, unit economics และ inventory จำนวนคำแนะนำสูงสุด 10 รายการใช้เป็น demand proxy เพื่อดูความกว้างของ intent เท่านั้น ไม่ใช่ search volume และไม่รับประกันอันดับหน้าแรก Google

สัญญาณของหน้าที่เลือกประกอบด้วย `capacity planning calculator` 8/10, `team capacity calculator` 6/10 และ `sprint capacity calculator` 6/10 พร้อม long-tail Excel, Agile, Scrum และ sprint team ส่วน `resource capacity calculator` มีเพียง 2/10 และปะปน YARN จึงใช้ Team เป็นชื่อหลัก `FTE calculator` ได้ 10/10 แต่ปะปนกฎประเทศ เงินเดือน การศึกษา และพยาบาล จึงตอบเฉพาะ FTE ด้านกำลังทีมภายในหน้าเดียว ไม่สร้างหน้า FTE กว้างที่สูตรไม่ครบทุก intent คำไทย `คำนวณกำลังคน` และ `คำนวณ capacity ทีม` ยังได้ 0/10, `คำนวณ fte` 4/10 และ `คำนวณภาระงาน` 1/10 ในรอบนี้

คะแนน 5 คือสูงที่สุด การจัดอันดับพิจารณา demand, ประโยชน์ต่อผู้ใช้จริง, ความต่างจาก 70 tools เดิม, ความโปร่งใสของสูตร, โอกาสรายได้จาก B2B intent, scalability และความเสี่ยงจากสูตรที่ขึ้นกับประเทศหรืออุตสาหกรรม:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Team Capacity & Workload Calculator | Capacity planning 8/10; Team 6/10; Sprint 6/10 | 4 | 5 | 5 | 5 | 4 | ส่งมอบ Batch 44; role capacity, FTE, leave, focus, buffer, demand, gap และ CSV ในหน้าเดียว |
| 2 | Loaded Labor Cost Calculator | Labor cost 10/10; Employee cost 10/10 | 4 | 5 | 5 | 5 | 4 | demand สูงแต่ภาระนายจ้างและกฎหมายต่างประเทศ ต้องเลือก generic loaded-cost หรือทำเวอร์ชันไทยจากแหล่งทางการ |
| 3 | Sales Commission Calculator | EN 10/10 พร้อม Excel/template/free | 4 | 5 | 5 | 5 | 4 | เหมาะ next batch หากรองรับ tier, accelerator, quota, cap และ clawback โดยไม่ตีความสัญญาแทนผู้ใช้ |
| 4 | Safety Stock Calculator | EN 10/10 พร้อม Excel/service level/inventory | 4 | 5 | 5 | 5 | 4 | สูตรต้องแยก demand/lead-time variability และอธิบาย service level กับ distribution assumption |
| 5 | Unit Economics Calculator | EN 8/10 พร้อม Excel/online | 4 | 5 | 5 | 5 | 4 | รวม CAC, contribution margin, LTV:CAC และ payback ได้ แต่ต้องหลีกเลี่ยงการผสม revenue กับ gross profit |
| 6 | Business ROI Calculator | EN 10/10 พร้อม business case/investment | 4 | 5 | 5 | 5 | 3 | intent กว้างและมูลค่าสูง แต่ต้องระบุ cash flow, time horizon และ discounting ไม่ใช้ ROI เดียวตัดสินทุกโครงการ |
| 7 | Customer Lifetime Value Calculator | EN 7/10 พร้อม Excel/online และคำไทย | 4 | 5 | 5 | 5 | 4 | ต้องแยก simple CLV จาก cohort/retention model และอธิบาย gross margin ชัดเจน |
| 8 | FTE Hours Calculator | EN 10/10 พร้อม country/salary/hours/Excel | 3 | 4 | 4 | 5 | 3 | intent กว้างแต่ fragmented; Batch 44 ตอบ FTE ด้าน capacity แล้ว รอ Search Console ก่อนสร้าง standalone |
| 9 | Business Cash Flow Calculator | EN 10/10 แต่ผลส่วนใหญ่เป็น rental/real estate | 4 | 5 | 5 | 5 | 3 | ต้องเลือก persona และแยก operating cash flow จาก property cash flow ก่อนสร้าง |
| 10 | Business Break-even Calculator | EN 3/10 ตรง business/small business/service | 3 | 5 | 5 | 5 | 3 | intent สะอาดกว่าคำกว้าง เหมาะ fixed/variable cost, unit และ revenue break-even |
| 11 | Economic Order Quantity Calculator | EN 4/10 พร้อม formula และคำไทย | 3 | 4 | 4 | 4 | 3 | สูตรตรวจสอบง่าย แต่ assumption demand คงที่และไม่มี stockout ต้องแสดงชัด |
| 12 | Churn Rate Calculator | EN 4/10 พร้อม SaaS/customer | 3 | 5 | 5 | 5 | 3 | ควรรวม logo churn, revenue churn และ expansion เพื่อไม่ให้ metric เดียวหลอกผู้ใช้ |
| 13 | Project ROI Calculator | EN 5/10 พร้อม Excel/management | 4 | 5 | 5 | 5 | 3 | เชื่อม Project Cost ได้ แต่ควรมี cash benefits และ time horizon ที่ตรวจสอบได้ก่อน |
| 14 | Cash Runway Calculator | EN 2/10 พร้อมคำไทย | 3 | 5 | 5 | 5 | 3 | ต้องแยก burn เฉลี่ยย้อนหลังจาก forecast และเตือนรายรับ/รายจ่ายไม่สม่ำเสมอ |
| 15 | Inventory Reorder Point Calculator | EN 1/10 | 3 | 4 | 4 | 4 | 3 | ใช้งานจริงแต่ demand proxy ต่ำ ควรจับคู่ Safety Stock/EOQ ใน inventory hub ภายหลัง |

Batch 44 ใช้ `Scheduled FTE × วันทำงาน × ชั่วโมงต่อวัน` เป็น Gross hours แล้วหัก `Scheduled FTE × วันลาเฉลี่ย × ชั่วโมงต่อวัน` เป็น Net scheduled hours จากนั้นคูณ Focus factor เพื่อหา Delivery capacity และหัก Buffer เป็น Planned capacity สูตรแสดงทุกชั้นแทนการใช้ headcount ดิบหรือ utilization benchmark ที่เดาแทนทีม

Workload เป็น `Demand ÷ Planned capacity × 100` และ Capacity gap เป็น `Planned capacity - Demand` ค่าบวกหมายถึงยังเหลือ ค่าลบหมายถึงขาด Scheduled FTE ที่ต้องเพิ่มคำนวณแยกแต่ละบทบาทจากชั่วโมงที่ขาดหาร Planned capacity ต่อ FTE ภายใต้สมมติฐานของบทบาทนั้น แล้วรวมส่วนขาดโดยไม่เอาชั่วโมงว่างข้ามทักษะมาหักล้าง หากทั้งรอบไม่มี capacity ต่อ FTE ระบบคืนสถานะคำนวณไม่ได้แทน Infinity หรือการเดาตัวเลข

UI รองรับ 30 กลุ่มด้วยการ์ด responsive, label เว้นจาก input อย่างสม่ำเสมอ, summary cards, capacity waterfall, utilization bar, คอขวดรายกลุ่ม และตารางรายละเอียดที่เลื่อนภายในจอเล็ก CSV มี UTF-8 BOM และ Formula Injection protection ข้อมูลไม่ออกจาก Browser หน้า SEO รวม Team Capacity, Capacity Planning, Sprint Capacity, Workload และ FTE intent ที่ใช้สูตรเดียวกันอย่างมีความหมาย แทนการสร้าง doorway pages หลายชื่อ

Microsoft อธิบาย Capacity Planning ว่าเป็นการเปรียบเทียบชั่วโมงที่ resource ทำได้กับชั่วโมงที่โครงการต้องการ Oracle แสดง requested hours, capacity hours, assigned hours และ surplus/shortfall แยกตาม role รวมทั้งนับ training, paid time off และ nonproject events ใน resource schedule ส่วน Atlassian แยก time-based capacity ออกจาก story points จึงทำให้หน้านี้ใช้ชั่วโมงเท่านั้นและเตือนไม่แปลง Story point โดยไม่มีข้อมูลย้อนหลัง

- [Google Autocomplete — team capacity calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=team%20capacity%20calculator)
- [Google Autocomplete — capacity planning calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=capacity%20planning%20calculator)
- [Google Autocomplete — sprint capacity calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=sprint%20capacity%20calculator)
- [Google Autocomplete — FTE calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=fte%20calculator)
- [Microsoft Support — Evaluate resource capacity in Project Online](https://support.microsoft.com/en-gb/office/evaluate-resource-capacity-in-project-online-9da06433-281c-49d3-bcf9-e1dc5d67ead4)
- [Oracle — Resource Capacity Planning by Project Role Dashboard](https://docs.oracle.com/en/cloud/saas/project-management/25b/fapca/resource-capacity-planning-by-project-role-dashboard.html)
- [Oracle — Resource Schedule](https://docs.oracle.com/en/cloud/saas/project-management/26b/oapem/resource-schedule.html)
- [Atlassian Support — Capacity in Scrum vs. Kanban teams](https://support.atlassian.com/jira-software-cloud/docs/capacity-in-scrum-vs-kanban-teams-in-advanced-roadmaps/)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

## รอบที่ 35 — Labor Cost & Employee Cost Calculator และการจัดอันดับ Batch 45

สำรวจเมื่อ 8 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) จำนวน 36 คำตั้งต้น ครอบคลุม labor/employee/employer cost, burden, loaded rate, contractor comparison, commission, inventory, ROI, CLV และต้นทุน HR จำนวนคำแนะนำสูงสุด 10 รายการเป็น demand proxy เพื่อดู intent และ long-tail เท่านั้น ไม่ใช่ search volume และไม่รับประกันอันดับหน้าแรก Google

สัญญาณหลักของหน้าที่เลือกคือ `labor cost calculator`, `employee cost calculator`, `employer cost calculator`, `labor burden calculator`, `true cost of employee calculator` และ `cost to company calculator` ได้ 10/10 ทั้งหมด พร้อม long-tail Excel, hourly, free และ industry/country variants ส่วน `loaded labor rate calculator` ได้ 2/10 และ `fully burdened labor cost calculator` 0/10 จึงใช้ Labor Cost + Employee Cost เป็นชื่อหลัก แต่รองรับ loaded/burden ด้วยสูตรเดียว คำ `employee cost calculator thailand`, `labor cost calculator thailand`, `คำนวณต้นทุนพนักงาน`, `คำนวณค่าแรงพนักงาน` และ `คำนวณต้นทุนแรงงาน` ได้ 0/10 ในรอบนี้ จึงไม่อ้าง demand ไทยเกินหลักฐาน

คะแนน 5 คือสูงที่สุด การจัดอันดับพิจารณา demand, คุณค่าผู้ใช้จริง, ความต่างจาก 71 tools เดิม, ความโปร่งใสของสูตร, โอกาสรายได้จาก B2B intent, scalability, innovation และความเสี่ยงจากกฎหมายหรือ benchmark:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Labor Cost & Employee Cost Calculator | Labor, Employee, Employer, Burden, True cost และ CTC 10/10 | 4 | 5 | 5 | 5 | 4 | ส่งมอบ Batch 45; pay basis, cost stack, productive hours, burden, multiplier, team budget และ CSV |
| 2 | Sales Commission Calculator | 10/10 พร้อม Excel/template/free | 4 | 5 | 5 | 5 | 4 | เหมาะ Batch 46 หากแยก flat, tier, accelerator, quota, cap และ clawback ชัดเจน |
| 3 | Safety Stock Calculator | 10/10 พร้อม Excel/standard deviation/service level | 4 | 5 | 5 | 5 | 4 | ต้องแยก demand variability, lead-time variability และ service-level assumption |
| 4 | Contractor vs Employee Cost Calculator | 10/10 แต่ country variants หนาแน่น | 5 | 5 | 5 | 5 | 4 | มูลค่าสูงแต่ต้องเปรียบเทียบ scope, hours, risk และ benefits โดยไม่วินิจฉัยสถานะจ้าง |
| 5 | Business ROI Calculator | 10/10 พร้อม Excel/business case | 4 | 5 | 5 | 5 | 3 | ต้องมี cash flow, time horizon และ discounting แทน ROI เดี่ยว |
| 6 | Unit Economics Calculator | 8/10 พร้อม Excel/online | 4 | 5 | 5 | 5 | 4 | รวม contribution margin, CAC, LTV:CAC และ payback โดยไม่ผสม revenue กับ gross profit |
| 7 | Customer Lifetime Value Calculator | 7/10 พร้อม Excel/online/คำไทย | 4 | 5 | 5 | 5 | 4 | ต้องแยก simple average model จาก retention/cohort model |
| 8 | Salary Employer Cost Calculator by Country | 3/10 และ country intent สูงใน Employer 10/10 | 5 | 5 | 5 | 5 | 3 | ต้องมีแหล่งทางการ versioned, cap และ effective date รายประเทศ จึงยังไม่ทำ preset |
| 9 | Training ROI Calculator | 3/10 พร้อม Excel/คำไทย | 4 | 4 | 4 | 4 | 4 | ต้องแยกผลผลิตที่อ้างเหตุได้จากผลลัพธ์ที่มีปัจจัยอื่นร่วม |
| 10 | Hiring Cost Calculator | 3/10 | 3 | 5 | 4 | 5 | 3 | รวม sourcing, recruiter, interview time, onboarding และ vacancy days ได้ |
| 11 | Business Break-even Calculator | 3/10 | 3 | 5 | 5 | 5 | 3 | เหมาะ fixed/variable/unit/revenue break-even และ service business |
| 12 | Cash Runway Calculator | 2/10 พร้อมคำไทย | 3 | 5 | 5 | 5 | 3 | ต้องแยก historical burn จาก forecast และรายรับไม่สม่ำเสมอ |
| 13 | Recruitment Cost Calculator | 2/10 | 3 | 4 | 4 | 4 | 3 | ใกล้ Hiring Cost ควรรวมเป็นหน้าเดียวแทน doorway page |
| 14 | Inventory Reorder Point Calculator | 1/10 | 3 | 4 | 4 | 4 | 3 | ควรจับคู่ Safety Stock ภายใต้ inventory hub ในอนาคต |
| 15 | Overtime Cost Calculator | 1/10 | 4 | 4 | 4 | 4 | 3 | Meaw Tools มี OT Thailand แล้ว จึงไม่สร้างหน้า generic ซ้ำจน Search Console พิสูจน์ intent ใหม่ |

Batch 45 แปลงค่าจ้างฐานเป็นรายปีตาม pay basis: รายเดือน × 12, รายปีใช้ตรงๆ และรายชั่วโมง × ชั่วโมงที่จ่ายต่อสัปดาห์ × สัปดาห์ที่จ่าย จากนั้นบวกโบนัส/เบี้ยเลี้ยง ภาระที่ผูกกับค่าจ้างฐาน ต้นทุนคงที่ต่อคน และ Overhead ที่คิดจากเงินสดรวม เพื่อหา Fully loaded annual cost

Labor burden rate เป็น `(ต้นทุนรวม - ค่าจ้างฐาน) ÷ ค่าจ้างฐาน × 100` และ Cost multiplier เป็น `ต้นทุนรวม ÷ ค่าจ้างฐาน` ชั่วโมงที่จ่ายรวมเวลาลาที่ได้รับค่าจ้างแล้ว วันลา/หยุด/อบรมจึงลดเฉพาะ Productive hours ที่ใช้เป็นตัวหาร ไม่ถูกบวกเป็นค่าแรงซ้ำ หากไม่มี Productive hours ระบบคืนค่าคำนวณไม่ได้แทน Infinity

Eurostat แยก labor cost เป็น wages/salaries กับ non-wage cost เช่น employer social contributions และเก็บทั้ง hours paid กับ hours worked ส่วน BLS ECEC วัด wages/salaries และ benefits ต่อ employee hour worked โดย benefits ครอบคลุม paid leave, supplemental pay, insurance, retirement และ legally required benefits OECD นิยาม compensation ว่ารวม gross wages กับ employer social contributions จึงทำให้หน้าแสดง cost stack และชั่วโมงสองฐานแทนการใช้ salary × benchmark เดียว

UI แบ่งเป็นค่าจ้าง/ตาราง, เงินสดผันแปร, ภาระตามค่าจ้าง, ต้นทุนคงที่ และ availability พร้อม label gap สม่ำเสมอ การ์ดผลลัพธ์ responsive, cost bars, breakdown, CSV และคำเตือนประเทศ/ช่วงเวลา ทุกข้อมูลคำนวณใน Browser การเลือกสกุลเงินเปลี่ยนเฉพาะหน่วย ไม่มี FX API และหน้าเดียวรวม Labor Cost, Employee Cost, Employer Cost, Labor Burden, Loaded Rate และ Cost to Company intent ที่ใช้สูตรเดียวอย่างมีความหมาย

- [Google Autocomplete — labor cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=labor%20cost%20calculator)
- [Google Autocomplete — employee cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=employee%20cost%20calculator)
- [Google Autocomplete — employer cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=employer%20cost%20calculator)
- [Google Autocomplete — labor burden calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=labor%20burden%20calculator)
- [Google Autocomplete — true cost of employee calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=true%20cost%20of%20employee%20calculator)
- [Google Autocomplete — cost to company calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=cost%20to%20company%20calculator)
- [Eurostat — Labour costs](https://ec.europa.eu/eurostat/web/labour-market/information-data/labour-costs)
- [U.S. BLS — Employer Costs for Employee Compensation Calculation](https://www.bls.gov/opub/hom/ecec/calculation.htm)
- [OECD — Employee compensation by activity](https://www.oecd.org/en/data/indicators/employee-compensation-by-activity.html)
- [GOV.UK — Work out National Insurance contributions](https://www.gov.uk/guidance/work-out-an-employees-national-insurance-contributions)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

## รอบที่ 36 — Sales Commission Calculator และการจัดอันดับ Batch 46

สำรวจเมื่อ 9 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) จำนวน 30 คำตั้งต้น ครอบคลุม sales/commission rate, tiered, split, quota, OTE, accelerator, cap, clawback และ vertical variants จำนวนคำแนะนำสูงสุด 10 รายการเป็น demand proxy สำหรับดู intent และ long-tail เท่านั้น ไม่ใช่ search volume และไม่รับประกันอันดับหน้าแรก Google

`sales commission calculator`, `commission calculator`, `commission rate calculator` และ `commission calculator free` ได้ 10/10; `OTE calculator` 9/10; `commission split calculator` 7/10; `tiered commission calculator` 6/10; `percentage commission calculator` 5/10; `คำนวณค่าคอมมิชชั่น` และ `sales quota calculator` 4/10; `commission payout calculator`, `quota attainment calculator` และ `commission calculator online` 3/10; ส่วน sales commission Excel, bonus, compensation, on-target earnings, revenue commission และ `คิดค่าคอมมิชชั่น` ได้ 2/10 ขณะที่ gross-margin commission และ accelerator ได้ 1/10 และ cap/clawback/Thailand/per-sale ได้ 0/10 ในรอบนี้

Affiliate, insurance และ real-estate commission ได้ 10/10 แต่มีสูตร แพลตฟอร์ม สัญญา และข้อกำหนดเฉพาะ vertical สูง จึงยังไม่สร้างหน้า country/industry ที่ดูคล้ายกันหลายหน้า Batch 46 รวม Flat, Marginal tiers, Retroactive tiers, split credit, quota, accelerator, cap, clawback, revenue/gross-profit basis และ OTE run-rate ที่ใช้แกนสูตรเดียวไว้หน้าเดียว ตามแนวทาง people-first และหลีกเลี่ยง doorway pages

คะแนน 5 คือสูงที่สุด การจัดอันดับพิจารณา demand, คุณค่าผู้ใช้จริง, ความต่างจาก 72 tools เดิม, ความโปร่งใสของสูตร, โอกาสรายได้จาก B2B intent, scalability, innovation และความเสี่ยงจากกฎหมายหรือเงื่อนไขแผน:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Sales Commission Calculator | Sales/Commission/Rate/Free 10/10 | 4 | 5 | 5 | 5 | 4 | ส่งมอบ Batch 46; รวม Flat, tiers, credit, quota, accelerator, cap, clawback, base pay และ CSV |
| 2 | OTE Calculator | OTE 9/10; on-target earnings 2/10 | 3 | 5 | 5 | 5 | 3 | มีมูลค่า B2B แต่ Batch 46 รองรับเพียง annualized run-rate ไม่อ้าง OTE ทางสัญญา |
| 3 | Insurance Commission Calculator | 10/10 | 5 | 5 | 5 | 4 | 3 | demand สูงแต่ policy, carrier, renewal, chargeback และกฎพื้นที่ต่างกัน ต้องวิจัย vertical แยก |
| 4 | Affiliate Commission Calculator | 10/10 | 4 | 4 | 5 | 5 | 3 | ต้องรองรับ order status, refund window, network fee และ attribution ของแต่ละแพลตฟอร์ม |
| 5 | Real Estate Commission Calculator | 10/10 | 5 | 5 | 5 | 4 | 3 | ต้องมี co-broke, brokerage split, fees, tax และ disclosure ตามพื้นที่ ไม่ควรใช้สูตร generic อ้างครบ |
| 6 | Commission Split Calculator | 7/10 | 3 | 5 | 5 | 5 | 3 | Batch 46 รองรับ Sales credit percentage แล้ว; รอดู Search Console ก่อนแยกหน้า |
| 7 | Tiered Commission Calculator | 6/10 | 4 | 5 | 5 | 5 | 4 | รวมใน Batch 46 และแยก Marginal จาก Retroactive ชัดเจน ไม่สร้างหน้า intent ซ้ำ |
| 8 | Percentage Commission Calculator | 5/10 | 2 | 4 | 4 | 4 | 2 | Flat rate ใน Batch 46 ครอบคลุมแล้ว หน้าแยกจะบางและเสี่ยง cannibalization |
| 9 | Sales Quota Calculator | 4/10 | 4 | 5 | 5 | 5 | 4 | Batch 46 วัด attainment/bonus ขั้นพื้นฐาน; รุ่นถัดไปควรมี ramp, weighted quota และ period pacing |
| 10 | Quota Attainment Calculator | 3/10 | 2 | 4 | 4 | 4 | 2 | รวมในผล Batch 46 แล้ว พร้อม amount-to-quota โดยไม่ต้องสร้างหน้า doorway |
| 11 | Sales Compensation Calculator | 2/10 | 5 | 5 | 5 | 5 | 4 | scope ใหญ่กว่า commission ต้องรวม draw, SPIFF, equity, territory และ scenario versioning |
| 12 | Bonus Commission Calculator | 2/10 | 3 | 4 | 4 | 4 | 3 | Quota bonus ใน Batch 46 ครอบคลุม fixed trigger; matrix bonus ต้องวิจัยเพิ่ม |
| 13 | Gross Margin Commission Calculator | 1/10 | 4 | 5 | 5 | 4 | 4 | Batch 46 รองรับ gross-profit basis พร้อม split cost และฐานไม่ต่ำกว่าศูนย์ |
| 14 | Sales Accelerator Calculator | 1/10 | 4 | 5 | 5 | 5 | 4 | ทำผ่าน tier rates ใน Batch 46 และบอก Threshold inclusivity ชัดเจน |
| 15 | Commission Clawback Calculator | 0/10 | 5 | 4 | 4 | 3 | 3 | Batch 46 รับยอด Adjustment ที่อนุมัติแล้ว แต่ไม่ตัดสินสิทธิ์เรียกคืนตามสัญญาหรือกฎหมาย |

สูตรเริ่มจาก `Net sales = Gross sales − Refunds`, คูณ Sales credit และเลือกฐาน Revenue หรือ `max(0, Credited net sales − Credited direct cost)` สำหรับ Gross profit แผน Flat ใช้ฐาน × อัตราเดียว; Marginal tiers แบ่งยอดแต่ละช่วงคูณอัตราของช่วง; Retroactive tiers ใช้อัตราขั้นสูงสุดที่ถึงกับฐานทั้งก้อน จากนั้นบวก Quota bonus และ Adjustment, จำกัด Floor ที่ศูนย์และ Payout cap ก่อนแสดง Effective payout rate และ annualized run-rate

Salesforce แยก Tier payout แบบ Retroactive ซึ่งใช้อัตราขั้นที่บรรลุกับฐานทั้งช่วง ออกจาก Marginal payout ซึ่งใช้แต่ละอัตรากับส่วนของฐานในช่วงนั้น และอธิบาย Accelerator ว่าเป็นตัวคูณหรืออัตราที่สูงขึ้นเมื่อผลงานผ่านระดับที่กำหนด จึงต้องให้ผู้ใช้เลือกสูตร ไม่เดาจากคำว่า “Tiered” เพียงคำเดียว เอกสาร compensation plan ควรระบุองค์ประกอบและกติกาให้ชัด หน้านี้จึงเตือนให้ตรวจเอกสารกับ Sales Ops/Finance และไม่อ้างเป็น Payroll ภาษี กฎหมาย หรือการอนุมัติ Payout

UI แบ่งเป็นแผน/ฐานยอดขาย, Tier editor, Quota/Payout และผลลัพธ์ มี label gap สม่ำเสมอ การ์ดผล responsive, Payout waterfall, milestone, ตารางขั้นที่เลื่อนในกรอบได้ และ CSV ทุกข้อมูลคำนวณใน Browser ไม่มี API หรือ LocalStorage การเลือกสกุลเงินเปลี่ยนเฉพาะหน่วย ไม่มี FX conversion

- [Google Autocomplete — sales commission calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=sales%20commission%20calculator)
- [Google Autocomplete — commission calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=commission%20calculator)
- [Google Autocomplete — commission rate calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=commission%20rate%20calculator)
- [Google Autocomplete — tiered commission calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=tiered%20commission%20calculator)
- [Google Autocomplete — commission split calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=commission%20split%20calculator)
- [Google Autocomplete — OTE calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=ote%20calculator)
- [Salesforce Help — Accelerator](https://help.salesforce.com/s/articleView?id=sales.spiff_accelerator.htm&language=en_US&type=5)
- [Salesforce Trailhead — Tier payout rules](https://trailhead.salesforce.com/it/content/learn/modules/salesforce-spiff-tier-payout-rules/get-started-with-tier-payouts)
- [Salesforce Trailhead — Compensation plans](https://trailhead.salesforce.com/it/content/learn/modules/annual-planning-with-sales-operations/put-it-all-in-writing-with-comp-plans)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central — AI features and your website](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google Search Central Blog — Doorway pages](https://developers.google.com/search/blog/2015/03/an-update-on-doorway-pages)

## รอบที่ 37 — Safety Stock & Reorder Point Calculator และการจัดอันดับ Batch 47

สำรวจเมื่อ 9 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) จำนวน 57 คำตั้งต้น ครอบคลุม Safety Stock, Reorder Point, Service level, Standard deviation, EOQ, Inventory turnover/days/cost, Warehouse space, ABC/FIFO, Demand forecast และคำไทย จำนวนคำแนะนำสูงสุด 10 รายการเป็น demand proxy สำหรับดู intent และ long-tail เท่านั้น ไม่ใช่ search volume และไม่รับประกันอันดับหน้าแรก Google

`safety stock calculator` และ `safety stock formula` ได้ 10/10 พร้อม long-tail Excel, Standard deviation, Inventory, Online, Monthly, Service level และ z-score; `reorder point formula` ได้ 10/10 และ `reorder point calculator` 6/10 พร้อม Excel, Safety Stock และ Inventory variants ขณะที่ `safety stock calculator excel/standard deviation/online/for inventory/with service level` ได้ 1/10 เพราะเป็นคำขยายของ seed หลัก ไม่ใช่หลักฐานว่าไม่มี intent ส่วน `สูตร safety stock` ได้ 2/10, `คำนวณ safety stock` และ `คำนวณสต๊อกสินค้า` 1/10 แต่ `คำนวณจุดสั่งซื้อ` กับ `จุดสั่งซื้อสินค้า` ได้ 0/10 ในรอบนี้ จึงใช้ชื่ออังกฤษหลักและอธิบายภาษาไทยโดยไม่อ้าง demand ไทยเกินหลักฐาน

หน้าเดียวรวม Safety Stock, Reorder Point, Reorder Level, Service-level/z-score, Standard deviation, Days of cover, Manual buffer และ Inventory position เพราะเป็นขั้นของการตัดสินใจเดียวกัน แต่ไม่รวม EOQ ซึ่งตอบ “สั่งครั้งละเท่าใด” ต่างจาก ROP ที่ตอบ “เริ่มสั่งเมื่อใด” การแยกตามสูตรและ intent จริงช่วยลด thin/doorway pages และ keyword cannibalization

คะแนน 5 คือสูงที่สุด การจัดอันดับพิจารณา demand, คุณค่าผู้ใช้จริง, ความต่างจาก 73 tools เดิม, ความโปร่งใสของสูตร, โอกาสรายได้ B2B, scalability, innovation และความเสี่ยงจากข้อมูล/บัญชี/การปฏิบัติงาน:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Safety Stock & Reorder Point Calculator | Safety Stock/Formula/ROP Formula 10/10; ROP Calculator 6/10 | 4 | 5 | 5 | 5 | 4 | ส่งมอบ Batch 47; 3 policy methods, combined variability, Inventory position, Pack rounding และ CSV |
| 2 | Inventory Turnover & Days on Hand Calculator | Turnover 10/10; Inventory days 6/10 | 3 | 5 | 5 | 5 | 4 | เหมาะ Batch 48; ต้องแยก COGS/Average inventory จาก Sales/Ending inventory และรวม DIO/DOH intent |
| 3 | EOQ & Order Quantity Calculator | Order quantity 7/10; EOQ 5/10; Economic order quantity 4/10 | 4 | 5 | 5 | 5 | 4 | คู่ถัดไปของ ROP แต่ต้องรวม ordering, holding, annual demand, MOQ และ price breaks อย่างโปร่งใส |
| 4 | Warehouse Space & Pallet Calculator | 8/10 พร้อม Excel/pallet/rack/utilization/cost | 4 | 5 | 5 | 5 | 4 | intent ปฏิบัติการสูง ต้องแยก floor, clear height, aisle, rack และ pallet position |
| 5 | Inventory Cost & Carrying Cost Calculator | Inventory cost 10/10 แต่มี gaming noise; Carrying/Holding 2/10 | 4 | 5 | 5 | 5 | 4 | ต้องแยก purchase, ordering, holding, shortage และ obsolescence ไม่ใช้เปอร์เซ็นต์ benchmark เดียว |
| 6 | Weighted Average Inventory Cost Calculator | Average inventory 7/10 พร้อม weighted-average variants | 4 | 5 | 5 | 4 | 3 | ต้องรองรับ periodic/perpetual และ transaction ledger โดยไม่อ้างเป็นบัญชีที่รับรอง |
| 7 | Lead Time Working Days Calculator | 10/10 แต่มี wheel/DHL/freight intent ปน | 3 | 4 | 4 | 5 | 3 | Meaw มี Business Days แล้ว ควรขยาย procurement milestone เมื่อ Search Console พิสูจน์ intent |
| 8 | FIFO Inventory Calculator | 4/10 | 4 | 5 | 4 | 4 | 3 | ต้องคำนวณ Layers, COGS และ Ending inventory พร้อมแยก Periodic/Perpetual |
| 9 | ABC Inventory Analysis | 3/10 | 4 | 5 | 4 | 5 | 4 | ใช้ Annual consumption value, CSV import และ Pareto threshold ที่แก้ได้ เหมาะข้อมูลหลาย SKU |
| 10 | Inventory Valuation Comparator | 2/10 | 5 | 5 | 5 | 4 | 4 | เปรียบเทียบ FIFO/Weighted average อย่างมี audit trail แต่กฎภาษี/บัญชีต่างพื้นที่ |
| 11 | Inventory Accuracy & Shrinkage Calculator | Accuracy 2/10; Shrinkage 2/10 | 3 | 4 | 4 | 4 | 3 | รวม Book vs Count, value variance, shrinkage rate และ cycle-count trend ในหน้าเดียว |
| 12 | Stock Coverage & Minimum Stock Calculator | Coverage 2/10; Minimum stock 2/10 | 3 | 4 | 4 | 4 | 3 | บางส่วนซ้อน Batch 47; รอดู query จริงก่อนสร้างหน้าใหม่ |
| 13 | Demand Forecast Accuracy Calculator | Demand forecast 2/10 | 5 | 5 | 5 | 5 | 5 | ควรรวม MAE, WAPE, Bias และ intermittent-demand caveat แทนสร้าง forecast จากข้อมูลน้อย |
| 14 | Purchase Order Calculator | 4/10 แต่ informational/funding intent ปน | 4 | 4 | 4 | 4 | 3 | ต้องนิยาม tax, freight, discount, MOQ และ landed cost ก่อนเลือก scope |
| 15 | Fill Rate & Inventory Service Level Calculator | 0/10 ใน seed เฉพาะ | 4 | 4 | 4 | 5 | 4 | มีประโยชน์แต่ต้องแยก Cycle service level จาก Fill rate และยังไม่มี demand proxy รองรับหน้าเดี่ยว |

Batch 47 รองรับสามนโยบายโดยไม่ผสม claims: (1) Service-level model ใช้ `σ Lead-time demand = √(Average lead time × Demand SD² + Average demand² × Lead-time SD²)` และ `Safety Stock = z × σ`; (2) Days of cover ใช้ `Average demand × Cover periods`; (3) Manual ใช้ Safety Stock ที่องค์กรกำหนด จากนั้นทุกวิธีหา `Reorder Point = Average demand × Average lead time + Safety Stock`

Oracle NetSuite ระบุ Inputs, z-score ตัวอย่าง, สูตร Combined variability, Normal distribution assumption และการปัดขึ้น พร้อมเตือนผลอาจคลาดเคลื่อนกับ Demand ขาดช่วง โปรโมชัน ฤดูกาล หรือข้อมูลเบ้ Oracle Replenishment Planning แยก Days of cover จาก Service-level based และใช้ Poisson กับ Intermittent demand ส่วน Oracle Inventory แยก Reorder Point ออกจาก EOQ จึงทำให้หน้าไม่เดา Order quantity และบอกข้อจำกัดของ Continuous-review ชัดเจน

Inventory position ในหน้าเป็น `On hand + On order − Backorders` และ Trigger เมื่อถึงหรือต่ำกว่า ROP เพื่อเป็นสัญญาณทบทวน ไม่สร้าง Purchase order อัตโนมัติ UI แบ่ง Policy/time basis, Demand/Lead time, Inventory snapshot และ Results มี label gap, responsive cards, ROP composition bar, Formula/assumption panel, Pack rounding, status และ CSV ทุกข้อมูลอยู่ใน Browser ไม่มี API หรือ LocalStorage

- [Google Autocomplete — safety stock calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=safety%20stock%20calculator)
- [Google Autocomplete — safety stock formula](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=safety%20stock%20formula)
- [Google Autocomplete — reorder point formula](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=reorder%20point%20formula)
- [Google Autocomplete — reorder point calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=reorder%20point%20calculator)
- [Google Autocomplete — inventory turnover calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=inventory%20turnover%20calculator)
- [Google Autocomplete — order quantity calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=order%20quantity%20calculator)
- [Google Autocomplete — warehouse space calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=warehouse%20space%20calculator)
- [Oracle NetSuite — Inventory Optimization Calculations](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_0702045810.html)
- [Oracle Replenishment Planning — How Safety Stock Is Calculated](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25c/faurp/how-safety-stock-is-calculated-in-oracle-replenishment-planning.html)
- [Oracle Inventory — Reorder Point Planning](https://docs.oracle.com/cd/A60725_05/html/comnls/us/inv/roplan.htm)
- [SAP — Calculating the Safety Stock and Reorder Level](https://help.sap.com/docs/SAP_ERP_SPV/42ad0c855a03441abde4d5db2fef5a65/a06db6531de6b64ce10000000a174cb4.html?version=6.17.28)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central — AI features and your website](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google Search Central Blog — Doorway pages](https://developers.google.com/search/blog/2015/03/an-update-on-doorway-pages)

## รอบที่ 38 — Inventory Turnover & Inventory Days Calculator และการจัดอันดับ Batch 48

สำรวจเมื่อ 9 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) จำนวน 60 คำตั้งต้น ครอบคลุม Inventory turnover/ratio/formula, Stock turn, DIO/DSI/Days on hand, Average inventory, COGS, EOQ, Warehouse space, Lead time, FIFO, Weighted average, Sell-through, Shrinkage, Fill rate, Service level และคำไทย จำนวนคำแนะนำสูงสุด 10 รายการเป็น demand proxy สำหรับดู intent และ long-tail เท่านั้น ไม่ใช่ Search volume และไม่รับประกันอันดับหน้าแรก Google

`inventory turnover calculator`, `inventory turnover formula`, `inventory turnover ratio formula`, `inventory turnover`, `inventory days formula`, `days inventory outstanding formula`, `average inventory formula`, `cost of goods sold calculator`, `cogs calculator` และ `inventory turnover in days` ได้ 10/10; `inventory turnover ratio calculator` 5/10; `inventory days calculator` 6/10; `average inventory calculator` 7/10; `stock turnover calculator` 4/10; `inventory turnover Excel` 10/10; monthly 6/10; calculator Excel/online 2/10 และ Inventory turnover by industry 10/10 ขณะที่คำไทย `สูตร inventory turnover` ได้ 3/10, `อัตราหมุนเวียนสินค้าคงเหลือ` และ `สูตรต้นทุนขาย` 1/10 ส่วนคำคำนวณไทยอื่นได้ 0/10 ในรอบนี้ จึงใช้ชื่ออังกฤษหลักและอธิบายไทยโดยไม่อ้าง Demand ไทยเกินหลักฐาน

หน้าเดียวรวม Inventory Turnover, Inventory Turnover Ratio/Rate/Period, Stock turn, Inventory days, DIO/DSI/DOH, Weeks/Months on hand และ Average inventory เพราะใช้ Inputs และการตีความชุดเดียวกัน ไม่สร้างหน้า Excel/online/monthly แยกซึ่งจะซ้ำ Intent และเสี่ยง Doorway/Cannibalization ส่วน COGS Calculator แบบเต็มยังแยกไว้ใน Backlog เพราะต้องรองรับ Opening inventory, Net purchases, Freight/direct cost, Returns และวิธีตีราคามากกว่าการรับยอด COGS จาก P&L ในหน้านี้

คะแนน 5 คือสูงที่สุด การจัดอันดับพิจารณา Demand, คุณค่าผู้ใช้จริง, ความต่างจาก 74 tools เดิม, ความโปร่งใสของสูตร, โอกาสรายได้ B2B, Scalability, Innovation และความเสี่ยงจากข้อมูลบัญชี/การปฏิบัติงาน:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Inventory Turnover & Inventory Days Calculator | Calculator/Formula 10/10; Ratio calculator 5/10; Days 6–10/10 | 3 | 5 | 5 | 5 | 4 | ส่งมอบ Batch 48; COGS/Average inventory, DIO/DOH, multi-snapshot, annualized, target gap และ CSV |
| 2 | COGS Calculator | Cost of goods sold/COGS 10/10 | 4 | 5 | 5 | 5 | 3 | แยกเป็น workflow บัญชีเต็มในอนาคต; Batch 48 รับยอด COGS ที่ผ่าน Cutoff แล้วและไม่แย่ง Keyword generic เกิน scope |
| 3 | EOQ & Order Quantity Calculator | EOQ 5/10; Economic EOQ 4/10 | 4 | 5 | 5 | 5 | 4 | คู่กับ ROP แต่ต้องรวม Ordering/Holding cost, Annual demand, MOQ, Price break และข้อจำกัด Capacity |
| 4 | Warehouse Space & Pallet Calculator | 8/10 พร้อม Excel/pallet/rack/utilization/cost | 4 | 5 | 5 | 5 | 4 | Intent ปฏิบัติการสูง ต้องแยก Floor/clear height, Aisle, Rack และ Pallet position |
| 5 | Sell-through Rate Calculator | 7/10 พร้อม free/app/eBay variants | 3 | 5 | 4 | 5 | 3 | ควรแยก Units received/sold/ending กับ Sales velocity และ Period cutoff ไม่รวม Marketplace scrape |
| 6 | Lead Time Working Days Calculator | 10/10 แต่มี Wheel/DHL/Freight noise มาก | 3 | 4 | 4 | 5 | 3 | ขยาย Business Days ด้วย Procurement milestones เมื่อ Search Console ยืนยัน Intent ธุรกิจจริง |
| 7 | Weighted Average Inventory Cost Calculator | Average inventory 7/10; Weighted variants 4/10 | 4 | 5 | 5 | 4 | 3 | ต้องแยก Periodic/Perpetual และ Transaction ledger; ไม่สร้างหน้า Average inventory บางซ้ำ Batch 48 |
| 8 | Inventory Cost & Carrying Cost Calculator | Inventory cost 10/10 แต่ Gaming noise; Carrying 2/10 | 4 | 5 | 5 | 5 | 4 | แยก Purchase, Ordering, Holding, Shortage และ Obsolescence โดยไม่ใช้ Benchmark เปอร์เซ็นต์เดียว |
| 9 | FIFO Inventory Calculator | 4/10 | 4 | 5 | 4 | 4 | 3 | ต้องคำนวณ Layers, COGS และ Ending inventory พร้อม Periodic/Perpetual ที่ชัดเจน |
| 10 | Inventory Accuracy & Shrinkage Calculator | Accuracy 2/10; Shrinkage 2/10 | 3 | 4 | 4 | 4 | 3 | รวม Book vs Count, Unit/value variance, Shrinkage rate และ Cycle-count trend |
| 11 | Fill Rate Calculator | 8/10 แต่ Plumbing/tank noise ปน; Relevant percentage 1/10 | 4 | 4 | 4 | 5 | 4 | ต้องแยก Order/Line/Unit fill rate และ Backorder policy ก่อนสร้างหน้า |
| 12 | Inventory Service Level Calculator | Service level 9/10 แต่ Call-center/SLA noise; Cycle-specific 1/10 | 4 | 4 | 4 | 5 | 4 | ต้องแยก Cycle service level, Fill rate และ z-score ไม่รวมกับ Call-center Intent |
| 13 | Minimum Stock & Coverage Calculator | 2/10; Weeks/Months on hand 1/10 | 3 | 4 | 4 | 4 | 3 | Weeks/Months on hand รวม Batch 48 แล้ว Minimum stock บางส่วนซ้อน Safety Stock จึงรอ Query จริง |
| 14 | Demand Forecast Accuracy Calculator | 2/10 | 5 | 5 | 5 | 5 | 5 | ควรรวม MAE, WAPE, Bias และ Intermittent-demand caveat แทน Forecast จากข้อมูลน้อย |
| 15 | GMROI Calculator | 1/10 | 3 | 4 | 4 | 4 | 3 | ใช้ Gross margin ÷ Average inventory cost แต่ต้องนิยาม Period, Returns และ Markdown ให้ตรงกัน |

Batch 48 ใช้ `Average inventory = (Opening inventory + Closing inventory) ÷ 2` หรือค่า Average จากระบบ/หลาย Snapshot, `Inventory turnover = COGS ÷ Average inventory` และ `Inventory days = Days in period ÷ Turnover` ซึ่งเท่ากับ `Average inventory ÷ COGS × Days in period` รอบที่สั้นกว่าปีแสดง Annualized turnover ด้วย `Turnover × 365 ÷ Period days` พร้อมระบุชัดว่าเป็น Run-rate ไม่ใช่ Forecast

QuickBooks Enterprise ระบุสูตร COGS/Average inventory, สูตร Average ต้น–ปลาย และ Inventory turnover days โดยตรง ส่วน QuickBooks Average Inventory อธิบายว่าการใช้ข้อมูลหลายช่วงช่วยลดอคติจากความผันผวน แต่ค่าเฉลี่ยก็ยังมีข้อจำกัดกับ Seasonality Xero ยืนยันสูตร Turnover และ DSI ขณะที่การตีความสูง/ต่ำต้องดู Industry/Product mix หน้าจึงไม่ใช้ Sales แทน COGS ไม่ตัดสิน Benchmark อัตโนมัติ และให้ Target เป็นค่าที่ผู้ใช้กำหนดเอง

UI แบ่ง Period/COGS, Average inventory method และ Target comparison มี Label gap สม่ำเสมอ, Responsive cards, Formula panel, Target gap, Ending inventory point-in-time coverage, Interpretation และ CSV ทุกข้อมูลคำนวณใน Browser ไม่มี API หรือ LocalStorage การเลือกหน่วยเงินเปลี่ยนเฉพาะรูปแบบแสดงผลและไม่มี FX conversion

- [Google Autocomplete — inventory turnover calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=inventory%20turnover%20calculator)
- [Google Autocomplete — inventory turnover formula](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=inventory%20turnover%20formula)
- [Google Autocomplete — inventory turnover ratio formula](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=inventory%20turnover%20ratio%20formula)
- [Google Autocomplete — inventory days calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=inventory%20days%20calculator)
- [Google Autocomplete — inventory days formula](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=inventory%20days%20formula)
- [Google Autocomplete — average inventory calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=average%20inventory%20calculator)
- [Google Autocomplete — COGS calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=cogs%20calculator)
- [QuickBooks Enterprise — Inventory Turnover report](https://quickbooks.intuit.com/learn-support/en-us/help-article/inventory-management/use-inventory-turnover-report-quickbooks-2024/L6nNqyuvy_US_en_US)
- [QuickBooks — How to find average inventory](https://quickbooks.intuit.com/r/midsize-business/average-inventory/)
- [Xero — Inventory management systems and KPIs](https://www.xero.com/us/guides/inventory-management-system/)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central Blog — Doorway pages](https://developers.google.com/search/blog/2015/03/an-update-on-doorway-pages)

## รอบที่ 39 — Cost of Goods Sold (COGS) Calculator และการจัดอันดับ Batch 49

สำรวจเมื่อ 9 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) จำนวน 60 คำตั้งต้น ครอบคลุม Cost of goods sold/COGS/Cost of sales, Beginning/Ending inventory, Goods available, Net purchases, Freight-in, Food cost, Cost per unit, Landed cost, EOQ, Warehouse, Sell-through, FIFO, Weighted average และคำไทย จำนวนคำแนะนำสูงสุด 10 รายการเป็น Demand proxy สำหรับดู Intent และ Long-tail เท่านั้น ไม่ใช่ Search volume และไม่รับประกันอันดับหน้าแรก Google

`cost of goods sold calculator`, `cost of goods sold formula`, `cogs calculator`, `cogs formula`, `cost of sales formula`, `calculate cost of goods sold`, `ending inventory formula`, `goods available for sale formula`, `net purchases formula`, `freight in cogs`, `food cost calculator`, `cost per unit calculator`, `inventory cost calculator` และ `landed cost calculator` ได้ 10/10; `cost of sales calculator` 6/10; `ending inventory calculator` 5/10; `food cost percentage calculator` 4/10 ส่วนคำไทย `คำนวณต้นทุนขาย` ได้ 5/10, `ต้นทุนขาย สูตร` 7/10, `ต้นทุนขาย คือ` 10/10, `คำนวณต้นทุนสินค้า` 4/10, `สินค้าคงเหลือต้นงวด` 5/10 และ `สินค้าคงเหลือปลายงวด` 6/10 จึงใช้ชื่ออังกฤษหลักคู่ชื่อไทยและอธิบายศัพท์บัญชีทั้งสองภาษา

หน้าเดียวรวม Cost of Goods Sold Calculator, COGS Calculator, Cost of sales formula, Beginning/Ending inventory, Goods available for sale, Net purchases, Gross profit, COGS percentage และ Cost per unit เมื่อใช้ Input/สูตรเดียวกัน ไม่สร้างหน้า Excel/Online/Formula แยก ส่วน Recipe/Food cost, Landed cost, FIFO และ Weighted average แยกไว้ใน Backlog เพราะต้องใช้ Yield/Waste, Import charges หรือ Transaction cost layers คนละ Workflow ไม่ควรยัดรวมเพื่อไล่ Keyword

คะแนน 5 คือสูงที่สุด การจัดอันดับพิจารณา Demand, คุณค่าผู้ใช้จริง, ความต่างจาก 75 tools เดิม, ความโปร่งใสของสูตร, โอกาสรายได้, Scalability, Innovation และความเสี่ยงด้านบัญชี/ข้อมูล:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Cost of Goods Sold (COGS) Calculator | Calculator/Formula 10/10; Cost of sales 6–10/10; ไทย 5–10/10 | 4 | 5 | 5 | 5 | 4 | ส่งมอบ Batch 49; Basic/Detailed, Net purchases, Direct costs, Goods available, Gross margin, Cost per unit และ CSV |
| 2 | Food Cost & Recipe Cost Calculator | Food cost 10/10; Percentage 4/10 | 4 | 5 | 5 | 5 | 4 | แยก Recipe quantity, Yield, Waste, Portion, Menu price และ Periodic restaurant COGS ไม่ใช้ยอดรวมแทนต้นทุนต่อเมนู |
| 3 | Landed Cost Calculator | 10/10 แต่มี Country/Carrier intent ปน | 4 | 5 | 5 | 5 | 4 | รวม Item, Freight, Insurance, Duty, Tax, Brokerage และ Allocation โดยไม่เดาอัตรานำเข้าของประเทศ |
| 4 | Warehouse Space & Pallet Calculator | 8/10 พร้อม Excel/Pallet/Rack/Utilization/Cost | 4 | 5 | 5 | 5 | 4 | แยก Floor/clear height, Aisle, Rack, Pallet position และ Utilization ให้ตรวจย้อนกลับได้ |
| 5 | Sell-through Rate Calculator | 7/10 พร้อม Free/App/eBay | 3 | 5 | 4 | 5 | 3 | ใช้ Units sold/received/available และ Period cutoff ไม่ Scrape Marketplace |
| 6 | EOQ & Order Quantity Calculator | EOQ 5/10 พร้อม Excel/Online/Formula | 4 | 5 | 5 | 5 | 4 | เชื่อม Safety Stock/ROP แต่ต้องรวม Ordering/Holding cost, Annual demand, MOQ, Price break และ Capacity |
| 7 | Cost per Unit Calculator | 10/10 แต่ Moving average/Electricity/Freight intent ปน | 3 | 4 | 4 | 5 | 3 | ต้องเลือก Product/Batch workflow และแยก Fixed/Variable cost ก่อนสร้าง ไม่ใช้ค่าเฉลี่ย COGS รวมแทนทุก SKU |
| 8 | Weighted Average Inventory Cost Calculator | 4/10 | 4 | 5 | 5 | 4 | 4 | รองรับ Periodic/Perpetual และ Transaction ledger พร้อม Audit trail |
| 9 | FIFO Inventory Calculator | 4/10 | 5 | 5 | 4 | 4 | 4 | คำนวณ Cost layers, COGS และ Ending inventory แยก Periodic/Perpetual |
| 10 | Ending Inventory Method Calculator | Calculator 5/10; Formula 10/10 | 4 | 4 | 4 | 4 | 3 | ไม่สร้างสูตรบางซ้ำ Batch 49; ควรรวมเฉพาะเมื่อเปรียบเทียบ FIFO/Weighted/Specific identification ได้จริง |
| 11 | Purchase Order Calculator | 4/10 และ Funding intent ปน | 4 | 4 | 4 | 4 | 3 | ต้องนิยาม Quantity, Price break, Freight, Discount, Tax, MOQ และ Approval scope ก่อน |
| 12 | Inventory Carrying Cost Calculator | 2/10 | 4 | 5 | 5 | 5 | 4 | แยก Capital, Storage, Service และ Risk cost โดยไม่ใช้ Benchmark เปอร์เซ็นต์เดียว |
| 13 | Inventory Accuracy & Shrinkage Calculator | Shrinkage 2/10 | 3 | 4 | 4 | 4 | 3 | รวม Book vs Count, Unit/value variance, Shrinkage rate และ Cycle-count trend |
| 14 | Fill Rate Calculator | 8/10 แต่ Plumbing/Tank noise สูง | 4 | 4 | 4 | 5 | 4 | ต้องแยก Order/Line/Unit fill rate กับ Backorder policy และยืนยัน Relevant query ก่อน |
| 15 | GMROI Calculator | 1/10 | 3 | 4 | 4 | 4 | 3 | Gross margin ÷ Average inventory cost แต่ต้องนิยาม Period, Returns และ Markdown ให้ตรงกัน |

Batch 49 ใช้สูตรพื้นฐาน `COGS = Beginning inventory + Purchases − Ending inventory` และสูตรละเอียด `Net purchases = Gross purchases − Purchase returns/allowances − Purchase discounts + Freight-in` แล้วบวก Direct labor, Materials และ Other direct production costs ที่ยังไม่รวมซ้ำเพื่อหา Goods available ก่อนหัก Ending inventory ยอดขายสุทธิเป็น Optional analysis เท่านั้น: `Gross profit = Net sales − COGS`, `Gross margin = Gross profit ÷ Net sales × 100` และ `COGS per unit = COGS ÷ Units sold`

IRS Publication 334 แสดง Beginning inventory, Purchases, Cost of labor, Materials/supplies, Other costs, Goods available และ Ending inventory เป็นโครงสร้างตรวจสอบ โดยระบุ Freight-in กับ Manufacturing overhead ที่เกี่ยวข้อง ส่วน QuickBooks แสดงสูตรขยาย Returns/Allowances/Discounts/Freight-in และ Xero ยืนยันสูตรพื้นฐานกับความสัมพันธ์ Revenue − COGS = Gross profit หน้าเครื่องมือจึงหยุดเมื่อ Ending inventory สูงกว่า Goods available, ไม่สร้าง COGS ติดลบ, เตือน Double counting และไม่อ้างโครงสร้าง IRS เป็นกฎภาษีไทย

UI แบ่ง Mode/Currency, Inventory/Purchases, Detailed adjustments/Production costs และ Optional sales มี Label gap สม่ำเสมอ, Responsive cards, COGS waterfall, Gross profit panel, Cost classification, Error state และ CSV ทุกข้อมูลคำนวณใน Browser ไม่มี API หรือ LocalStorage และหน่วยเงินไม่มี FX conversion

- [Google Autocomplete — cost of goods sold calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=cost%20of%20goods%20sold%20calculator)
- [Google Autocomplete — cost of goods sold formula](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=cost%20of%20goods%20sold%20formula)
- [Google Autocomplete — COGS calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=cogs%20calculator)
- [Google Autocomplete — คำนวณต้นทุนขาย](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B8%95%E0%B9%89%E0%B8%99%E0%B8%97%E0%B8%B8%E0%B8%99%E0%B8%82%E0%B8%B2%E0%B8%A2)
- [Google Autocomplete — food cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=food%20cost%20calculator)
- [Google Autocomplete — landed cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=landed%20cost%20calculator)
- [Google Autocomplete — warehouse space calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=warehouse%20space%20calculator)
- [QuickBooks — Cost of Goods Sold Formula](https://quickbooks.intuit.com/global/resources/expenses/cost-of-goods-sold-formula/)
- [QuickBooks — Cost of Goods Sold](https://quickbooks.intuit.com/r/bookkeeping/cost-of-goods-sold/)
- [Xero — Understanding and calculating COGS](https://www.xero.com/au/guides/cogs/)
- [IRS Publication 334 — How To Figure Cost of Goods Sold](https://www.irs.gov/publications/p334)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central Blog — Doorway pages](https://developers.google.com/search/blog/2015/03/an-update-on-doorway-pages)

## รอบที่ 40 — Food Cost & Recipe Cost Calculator และการจัดอันดับ Batch 50

สำรวจเมื่อ 9 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) จำนวน 60 คำตั้งต้น ครอบคลุม Food/Recipe/Ingredient/Portion/Menu price, Bakery/Cake/Drink/Coffee/Cocktail/Catering/Meal cost, Yield/Waste, Margin/Variance และคำไทย จำนวนคำแนะนำสูงสุด 10 รายการเป็น Demand proxy สำหรับดู Intent และ Long-tail เท่านั้น ไม่ใช่ Search volume และไม่รับประกันอันดับหน้าแรก Google

`food cost calculator`, `food cost formula`, `food cost percentage formula`, `recipe cost calculator`, `recipe costing calculator`, `free recipe cost calculator`, `recipe cost spreadsheet`, `food cost calculator excel`, `baking cost calculator`, `cake cost calculator`, `drink cost calculator`, `meal cost calculator` และ `menu price calculator` ได้ 10/10; `ingredient cost calculator` 9/10; `coffee cost calculator` 8/10; `bakery cost calculator` และ `catering cost calculator` 7/10; `cocktail cost calculator` กับ `menu pricing formula` 6/10 ส่วนคำไทย `คำนวณต้นทุนอาหาร` ได้ 4/10 พร้อมคำต่อท้าย Excel/อาหารตามสั่ง และ `คำนวณต้นทุนเบเกอรี่` ได้ 2/10

หน้าเดียวรวม Food Cost Calculator, Recipe/Ingredient/Portion Cost, Baking/Cake Cost, Cost per serving, Menu price และ Food cost percentage เพราะใช้รายการวัตถุดิบ หน่วย Yield จำนวนเสิร์ฟ และราคาขายชุดเดียวกัน ไม่สร้างหน้า Excel/Free/Online หรือ Bakery/Cake แยกซึ่งจะซ้ำ Intent และเสี่ยง Doorway/Cannibalization ส่วน Drink/Cocktail pour cost, Catering per person, Recipe scaling, Actual-vs-theoretical variance และ Menu engineering แยกไว้ใน Backlog เพราะต้องมี Pour size, Guest count, Scaling rule, Inventory variance หรือ Sales volume คนละ Workflow

คะแนน 5 คือสูงที่สุด การจัดอันดับพิจารณา Demand, คุณค่าผู้ใช้จริง, ความต่างจาก 76 tools เดิม, ความโปร่งใสของสูตร, โอกาสรายได้จาก AdSense, Scalability, Innovation และความเสี่ยงด้านบัญชี/ข้อมูล:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Food Cost & Recipe Cost Calculator | Food/Recipe/Baking/Cake/Menu 10/10 | 4 | 5 | 5 | 5 | 4 | ส่งมอบ Batch 50; Ingredient lines, Unit conversion, Yield, Portion, Direct cost, Menu price, Contribution และ CSV |
| 2 | Baking & Cake Cost Calculator | Baking/Cake 10/10; Bakery 7/10 | 3 | 5 | 5 | 5 | 3 | Intent หลักรวม Batch 50 แล้ว ไม่สร้างหน้าบางแยก; ค่อยแยกเมื่อมี Batch size/Decoration/Labor workflow ที่ต่างจริง |
| 3 | Drink & Cocktail Pour Cost Calculator | Drink 10/10; Cocktail 6/10 | 4 | 5 | 5 | 5 | 4 | แยก Bottle volume, Pour size, Garnish, Ice, Spillage, ABV และราคาต่อแก้ว |
| 4 | Catering Cost per Person Calculator | Catering 7/10 | 4 | 5 | 5 | 5 | 4 | รวม Guest count, Portions, Buffer, Staffing, Equipment, Travel และ Quote margin |
| 5 | Coffee Cost per Cup Calculator | 8/10 | 3 | 5 | 5 | 5 | 3 | แยก Beans dose, Milk, Syrup, Cup/lid, Waste และ Channel fee; ไม่ทำหน้าบางซ้ำ Batch 50 |
| 6 | Food Cost Variance Calculator | Variance 5/10 | 5 | 5 | 5 | 5 | 5 | เทียบ Theoretical recipe cost กับ Actual COGS/Waste/Comp/Staff meal โดยต้องนิยาม Period และ Inventory cutoff |
| 7 | Recipe Yield & Scaling Calculator | Yield 4/10 | 4 | 5 | 4 | 5 | 4 | Scale portion พร้อม Non-linear warning, Baker's percentage, Rounding และ Production batch |
| 8 | Meal Prep Cost Calculator | Meal 10/10 แต่ Intent กว้าง | 3 | 4 | 4 | 5 | 3 | Batch 50 รองรับสูตรหนึ่งชุดแล้ว; งานใหม่ควรรวม Weekly plan, Containers, Shopping list และหลายสูตร |
| 9 | Edible Portion & Yield Cost Calculator | Target/Yield 4–5/10 | 4 | 5 | 4 | 5 | 4 | เก็บ AP/EP test หลายครั้ง, Weighted yield, Trim/by-product credit และ Supplier comparison |
| 10 | Menu Engineering Calculator | Menu price 10/10 | 5 | 5 | 5 | 5 | 5 | ใช้ Sales volume + Contribution แบ่ง Star/Plowhorse/Puzzle/Dog ต้องมีช่วงเวลาและ Product mix |
| 11 | Bakery Production Batch Planner | Related intent จาก Baking/Recipe | 4 | 5 | 4 | 5 | 4 | รวม Orders, Pan/Tray capacity, Proof/Bake schedule, Batch rounding และ Shopping list |
| 12 | Packaging & Fulfillment Cost Calculator | Packaging เป็น Long-tail ของ Food cost | 3 | 5 | 4 | 5 | 3 | แยก Inner/Outer pack, Inserts, Labor, Shipping material และ Order-size tiers |
| 13 | Restaurant Prime Cost Calculator | Food/Labor cost intent เกี่ยวข้อง | 4 | 5 | 5 | 5 | 4 | รวม COGS + Labor ตามงวด พร้อม Sales ratio แต่ต้องไม่ปน Recipe cost ต่อเมนู |
| 14 | Restaurant COGS Calculator | Restaurant food cost 3/10 | 4 | 4 | 4 | 4 | 3 | Workflow งวดบัญชีมี COGS Calculator แล้ว ควรเพิ่มคำอธิบาย/ลิงก์แทน Duplicate page |
| 15 | Ingredient Price Change Impact | Ingredient cost 9/10 | 4 | 5 | 4 | 5 | 4 | เปรียบเทียบ Supplier/Scenario และผลต่อทุกเมนู ต้องมี Recipe catalog หลายสูตรจึงคุ้มสร้าง |

Batch 50 ใช้ `Usable purchase quantity = Purchase quantity × Yield %`, `Ingredient line cost = Purchase cost × Recipe quantity ÷ Usable purchase quantity`, `Ingredient cost per serving = Ingredient cost per batch ÷ Servings` และ `Food cost % = Ingredient cost per serving ÷ Selling price × 100` ส่วน `Target menu price = Ingredient cost per serving ÷ Target food cost %` เป็นจุดตรวจจากวัตถุดิบ ไม่ใช่ราคาที่รับรองกำไรหรือราคาที่ตลาดยอมรับ Packaging ต่อเสิร์ฟ ค่าแรงตรง และต้นทุนตรงอื่นถูกแยกจาก Ingredient food cost แล้วรวมเป็น Total direct cost เพื่อไม่ให้คำจำกัดความปนกัน

Vancouver Community College แสดงการปรับ AP cost ด้วย Yield เพื่อหา EP unit cost, Portion cost และ Menu price factor ส่วน USDA Food Buying Guide อธิบาย Preparation yield, การเทียบหน่วย และ AP-to-ready-to-cook quantity และ Escoffier ยืนยันสูตร Per-item food cost = Item cost ÷ Menu price × 100 หน้าจึงตรวจว่า Purchase/Recipe unit เป็นประเภทเดียวกัน รองรับ g↔kg, ml↔L และชิ้น จำกัด Yield 0.1–100% และไม่เดา Density ของถ้วย/ช้อน

UI แบ่ง Recipe target, Ingredients/Yield และ Direct costs ใช้ Label gap สม่ำเสมอ, Editor แบบ Responsive, ผลลัพธ์ต่อ Batch/Serving, Ingredient breakdown, Formula panel, Error state และ CSV ทุกข้อมูลคำนวณใน Browser ไม่มี API หรือ LocalStorage ชื่อวัตถุดิบใน CSV ถูกป้องกัน Spreadsheet Formula Injection และหน่วยเงินไม่มี FX conversion

- [Google Autocomplete — food cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=food%20cost%20calculator)
- [Google Autocomplete — recipe cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=recipe%20cost%20calculator)
- [Google Autocomplete — ingredient cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=ingredient%20cost%20calculator)
- [Google Autocomplete — baking cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=baking%20cost%20calculator)
- [Google Autocomplete — menu price calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=menu%20price%20calculator)
- [Google Autocomplete — คำนวณต้นทุนอาหาร](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B8%95%E0%B9%89%E0%B8%99%E0%B8%97%E0%B8%B8%E0%B8%99%E0%B8%AD%E0%B8%B2%E0%B8%AB%E0%B8%B2%E0%B8%A3)
- [Vancouver Community College — Recipe Costing](https://library.vcc.ca/media/vcc-library/content-assets/learning-centre/worksheets/by-coursex2fprogram/business/CulinaryMath-RecipeCosting.pdf)
- [USDA Food Buying Guide — Appendix A](https://foodbuyingguide.fns.usda.gov/Appendix/ResourceAppendixA)
- [Escoffier — How to Calculate Food Cost Percentage](https://www.escoffier.edu/blog/culinary-pastry-careers/how-to-calculate-food-cost-percentage/)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central Blog — Doorway pages](https://developers.google.com/search/blog/2015/03/an-update-on-doorway-pages)

## รอบที่ 41 — Drink, Cocktail & Liquor Cost Calculator และการจัดอันดับ Batch 51

สำรวจเมื่อ 9 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) จำนวน 60 คำตั้งต้น ครอบคลุม Drink/Beverage/Liquor/Pour/Cocktail/Beer/Coffee cost, Cost per ounce/ml, Bottle yield, Batch/Dilution/ABV/Standard drink, Inventory/Variance/Menu engineering และคำไทย จำนวนคำแนะนำสูงสุด 10 รายการเป็น Demand proxy สำหรับดู Intent และ Long-tail เท่านั้น ไม่ใช่ Search volume และไม่รับประกันอันดับหน้าแรก Google

`drink cost calculator`, `liquor cost calculator`, `liquor cost percentage`, `pour cost calculator`, `beverage cost formula`, `alcohol dilution calculator` และ `standard drink calculator` ได้ 10/10; `beer cost calculator` 9/10; `cocktail batch calculator` กับ `coffee cost calculator` 8/10; `beverage cost calculator` 7/10; `cocktail abv calculator` กับ `cocktail cost calculator` 6/10 ส่วนคำไทย `คำนวณต้นทุนเครื่องดื่ม` ได้ 2/10 พร้อมคำต่อท้าย Excel และคำไทยด้านร้านกาแฟ/ตาราง/สูตรได้ 1/10

หน้าเดียวรวม Drink Cost Calculator, Liquor Cost Calculator, Pour Cost Calculator, Cocktail Cost Calculator, Beverage cost formula, Cost per ml/fl oz, Bottle yield และ Mocktail cost เพราะใช้ราคาขวด ปริมาตร ปริมาณริน Yield และราคาขายชุดเดียวกัน พร้อมวิเคราะห์ ABV/standard drink จาก Recipe เป็นส่วนเสริมที่ไม่สร้าง Thin page ส่วน Coffee per cup, Beer/Keg, Cocktail batch production, Alcohol dilution และ Periodic beverage COGS แยกไว้ เพราะต้องใช้ Beans dose, Keg loss, Batch scaling, Final-strength mixing หรือ Inventory cutoff คนละ Workflow

คะแนน 5 คือสูงที่สุด การจัดอันดับพิจารณา Demand, คุณค่าผู้ใช้จริง, ความต่างจาก 77 tools เดิม, ความโปร่งใสของสูตร, โอกาสรายได้จาก AdSense, Scalability, Innovation และความเสี่ยงด้านบัญชี/ความปลอดภัย:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Drink, Cocktail & Liquor Cost Calculator | Drink/Liquor/Pour 10/10; Cocktail 6/10 | 4 | 5 | 5 | 5 | 4 | ส่งมอบ Batch 51; Bottle/Pour/Yield, Garnish, Direct cost, Pricing, ABV, Standard drink และ CSV |
| 2 | Coffee Cost per Cup Calculator | 8/10 | 4 | 5 | 5 | 5 | 4 | แยก Beans dose, Shot yield, Milk, Syrup, Cup/lid, Waste, Channel fee และหลาย Size |
| 3 | Beer & Keg Pour Cost Calculator | 9/10 | 4 | 5 | 5 | 5 | 4 | แยก Keg volume, Foam/loss, Glass size, Draft yield, Line cleaning และ Deposit |
| 4 | Cocktail Batch & Dilution Calculator | 8/10 | 5 | 5 | 5 | 5 | 5 | รวม Serving count, Batch target, Water addition, Chill dilution, Container headspace และ Production rounding |
| 5 | Cocktail ABV & Standard Drink Calculator | ABV 6/10; Standard drink 10/10 | 4 | 5 | 4 | 5 | 5 | Recipe estimate รวมใน Batch 51 แล้ว ไม่สร้างหน้าบาง; ค่อยแยกเมื่อรองรับ Ingredient density และหลายมาตรฐานประเทศ |
| 6 | Beverage Cost Variance Calculator | Related operational intent | 5 | 5 | 5 | 5 | 5 | เทียบ Theoretical pour กับ Actual usage/Sales/Comp/Spillage โดยต้องนิยาม Period และ Inventory cutoff |
| 7 | Bar Inventory & Cycle Count | Inventory direct demand ต่ำ | 5 | 5 | 5 | 5 | 4 | รองรับ Partial bottle, Full-weight/tare, Count sheet, Variance และ Reorder โดยไม่เดา Density |
| 8 | Wine Pour Cost Calculator | Related Pour intent | 3 | 5 | 4 | 4 | 3 | รวม Bottle size, Glass pour, Preservation loss และแก้วต่อขวด; สูตรพื้นฐานรวม Batch 51 แล้ว |
| 9 | Mocktail Cost Calculator | Related Cocktail intent | 3 | 4 | 4 | 4 | 3 | ABV 0% ใช้ Batch 51 ได้แล้ว ไม่สร้าง Duplicate page เว้นแต่เพิ่ม Syrup batch/Carbonation workflow |
| 10 | Cost per Ounce / ml Calculator | Cost per ounce 7/10 | 2 | 4 | 4 | 4 | 2 | รวม Batch 51 ผ่าน Unit conversion และ Line cost แล้ว ไม่สร้างหน้าบางซ้ำ |
| 11 | Alcohol Dilution Calculator | 10/10 แต่ Home-distilling/Legal intent ปน | 5 | 4 | 4 | 4 | 5 | ต้องแยก Final ABV, Temperature/Volume contraction, Safety และข้อกฎหมาย ไม่ยัดรวม Pricing workflow |
| 12 | Cocktail Recipe Scaling Calculator | Related Batch intent | 4 | 5 | 4 | 5 | 4 | แยก Per-drink/Batch units, Rounding, Bottle purchase list และ Non-linear garnish/dilution |
| 13 | Bar Menu Engineering Calculator | Related pricing intent | 5 | 5 | 5 | 5 | 5 | ใช้ Sales mix + Contribution แบ่งเมนูและวัด Profit impact ต้องมีช่วงเวลาและข้อมูลหลายเมนู |
| 14 | Liquor Bottle Yield & Shot Pricing | Liquor/Pour 10/10 | 3 | 4 | 4 | 4 | 3 | สูตรพื้นฐานรวม Batch 51 แล้ว; งานแยกควรมี Shot sizes, Bottle comparison และ Case discount จริง |
| 15 | Beverage COGS Calculator | Beverage formula 7–10/10 | 4 | 4 | 4 | 4 | 3 | Workflow งวดบัญชีมี COGS Calculator แล้ว ควรเพิ่มลิงก์/คำอธิบายแทน Duplicate page |

Batch 51 ใช้ `Usable bottle volume = Container volume × Yield %`, `Line cost = Bottle cost × Pour volume ÷ Usable bottle volume`, `Beverage ingredient cost = Liquid cost + Garnish/Ice/extra ingredients`, `Pour cost % = Beverage ingredient cost ÷ Selling price × 100` และ `Target price = Beverage ingredient cost ÷ Target pour cost %` ส่วน Packaging, Direct labor และ Other direct cost แยกจาก Pour cost แล้วรวมเป็น Total direct cost เพื่อไม่ให้คำจำกัดความปนกัน

ค่าประมาณแอลกอฮอล์ใช้ `Pure alcohol = Σ(Pour volume × ABV)`, `Estimated ABV = Pure alcohol ÷ (Entered liquid + Added dilution) × 100` และ `U.S. standard drink equivalent = Pure alcohol ÷ (0.6 U.S. fl oz)` โดยใช้ 1 U.S. fl oz = 29.5735295625 ml หน้าระบุชัดว่าไม่ใช่ BAC ไม่ใช้ตัดสินการขับขี่ ความปลอดภัย หรือข้อกฎหมายไทย และรองรับ Mocktail ด้วย ABV 0%

UI แบ่ง Price target, Liquid ingredients, Direct costs/Dilution ใช้ Label gap สม่ำเสมอ, Responsive editor, Cost composition, Pricing status, Alcohol analysis, Ingredient table, Formula panel, Error state และ CSV ทุกข้อมูลคำนวณใน Browser ไม่มี API หรือ LocalStorage ชื่อส่วนผสมใน CSV ถูกป้องกัน Spreadsheet Formula Injection และหน่วยเงินไม่มี FX conversion

- [Google Autocomplete — drink cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=drink%20cost%20calculator)
- [Google Autocomplete — liquor cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=liquor%20cost%20calculator)
- [Google Autocomplete — pour cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=pour%20cost%20calculator)
- [Google Autocomplete — cocktail cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=cocktail%20cost%20calculator)
- [Google Autocomplete — คำนวณต้นทุนเครื่องดื่ม](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B8%95%E0%B9%89%E0%B8%99%E0%B8%97%E0%B8%B8%E0%B8%99%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B8%94%E0%B8%B7%E0%B9%88%E0%B8%A1)
- [NIST — U.S. Customary to SI Conversion Factors](https://www.nist.gov/document/f-033pdf)
- [NIAAA — What Is A Standard Drink?](https://www.niaaa.nih.gov/alcohols-effects-health/what-standard-drink)
- [NIAAA — Mixed Drink and Cocktail Calculator](https://rethinkingdrinking.niaaa.nih.gov/tools/calculators/mixed-drink-and-cocktail-content-calculator)
- [Johnson & Wales University — The Cost of a Martini](https://online.jwu.edu/blog/hospitality-the-cost-of-a-martini/)
- [Cost Control for the Hospitality Industry — Beverage Cost](https://resources.escoffier.edu/ge130/dopson/dopson_c05.pdf)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central Blog — Doorway pages](https://developers.google.com/search/blog/2015/03/an-update-on-doorway-pages)

## รอบที่ 42 — Coffee Cost Calculator และการจัดอันดับ Batch 52

สำรวจเมื่อ 9 สิงหาคม 2569 ด้วย Google Autocomplete locale ไทย (`hl=th`, `gl=th`) จำนวน 60 คำตั้งต้น ครอบคลุม Coffee cost/Cost per cup/Pricing/Profit/Margin, Coffee shop/Cafe, Espresso/Latte/Cappuccino/Iced/Cold brew, Beans/Dose/Yield/Waste, Milk/Syrup/Packaging, Roasting/Wholesale, Inventory/COGS/Forecast และคำไทย จำนวนคำแนะนำสูงสุด 10 รายการเป็น Demand proxy สำหรับดู Intent และ Long-tail เท่านั้น ไม่ใช่ Search volume และไม่รับประกันอันดับหน้าแรก Google

`coffee cost calculator` ได้ 8/10 พร้อม Coffee shop, Drink, Roasting, Cup และ Cost per cup variants; `coffee roasting calculator` 5/10; `cafe cost calculator` กับ `coffee cup cost calculator` 4/10; `coffee cost per cup calculator`, `cost per cup coffee calculator`, `coffee profit calculator` และคำไทย `คำนวณต้นทุนกาแฟ` ได้ 3/10; `coffee dose calculator`, `coffee margin calculator`, `coffee pricing calculator` และ `coffee shop profit calculator` ได้ 2/10 ส่วน `espresso cost calculator`, `latte cost calculator`, `coffee beans cost per cup`, `coffee cogs calculator`, `coffee drink cost calculator`, `coffee shop cost calculator` และ `ต้นทุนกาแฟต่อแก้ว` ได้ 1/10

หน้าเดียวรวม Coffee Cost Calculator, Cost per cup, Beans/Dose, Milk/Syrup/Ingredient cost, Espresso/Latte/Cappuccino/Iced coffee menu cost, Packaging/Labor/Channel fee, ราคาเป้าหมาย, Cups per bag และ Inventory usage รายเดือน เพราะใช้ Standard recipe และข้อมูลต่อแก้วชุดเดียวกัน ไม่สร้างหน้าแยกตามชื่อเมนูหรือคำ Free/Online/Excel ส่วน Roasting weight loss, Coffee shop break-even, Extraction yield, Cold brew batch และ Periodic COGS แยกไว้ เพราะต้องใช้ Green-to-roasted mass, Fixed overhead, Beverage output/TDS, Batch steeping หรือ Inventory cutoff คนละ Workflow

คะแนน 5 คือสูงที่สุด การจัดอันดับพิจารณา Demand, คุณค่าผู้ใช้จริง, ความต่างจาก 78 tools เดิม, ความโปร่งใสของสูตร, โอกาสรายได้จาก AdSense, Scalability, Innovation และความเสี่ยงจากข้อมูล/บัญชี:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Coffee Cost Calculator | Coffee cost 8/10; Cost per cup 3–4/10; ไทย 3/10 | 4 | 5 | 5 | 5 | 4 | ส่งมอบ Batch 52; Bean dose/yield, Milk, Extras, Packaging/Labor/Fee, Price, Monthly usage และ CSV |
| 2 | Coffee Roasting Cost & Weight Loss Calculator | 5/10 | 5 | 5 | 5 | 5 | 5 | แยก Green cost, Roast loss, Energy, Labor, Packaging, Defect, Batch yield และ Roasted cost/kg |
| 3 | Coffee Shop Profit & Break-even Calculator | Profit 3/10 | 5 | 5 | 5 | 5 | 4 | ต้องรวม Product mix, Fixed/Variable cost, Rent/Labor, Tax basis, Capacity และ Break-even cups โดยไม่ใช้ Contribution แทน Net profit |
| 4 | Multi-size Coffee Menu Pricing | Pricing 2/10 | 4 | 5 | 5 | 5 | 4 | เทียบ S/M/L Dose, Milk, Packaging, Price ladder, Margin และ Cannibalization แทนใช้สูตรเดียวกับทุก Size |
| 5 | Coffee Extraction Yield & Dose Calculator | Dose/Yield 2/10 | 5 | 5 | 4 | 5 | 5 | แยก Ground dose, Beverage mass, TDS, Extraction yield และ Brew ratio ต้องมีข้อจำกัดเครื่องมือวัดชัดเจน |
| 6 | Coffee Inventory Usage & Reorder Planner | Direct seed 0/10 | 5 | 5 | 5 | 5 | 4 | ใช้ Sales mix + Recipe หลายเมนู, On-hand, Lead time, Pack size, Waste และ Purchase plan ไม่ใช้ยอดเมนูเดียวแทนทั้งร้าน |
| 7 | Coffee Ingredient Price Impact & Supplier Comparison | Related cost intent | 4 | 5 | 4 | 5 | 4 | เปรียบเทียบ Bean/Milk/Syrup price, MOQ, Yield และผลต่อหลายเมนูพร้อม Scenario audit trail |
| 8 | Cold Brew Batch Cost Calculator | Exact seed 0/10 | 4 | 5 | 4 | 5 | 4 | แยก Coffee/water ratio, Steeping loss, Concentrate yield, Dilution, Batch servings, Bottle และ Shelf-life warning |
| 9 | Coffee Wholesale & Roaster Pricing Calculator | Exact seed 0–1/10 | 5 | 5 | 5 | 5 | 4 | รวม Green/roast loss, Bagging, Fulfillment, Wholesale/retail tiers, MOQ และ Distributor margin |
| 10 | Coffee Menu Engineering | Related pricing/profit intent | 5 | 5 | 5 | 5 | 5 | ใช้ Sales mix + Contribution หลายเมนูแบ่ง Popularity/Profitability และวัด Price-change impact ตามช่วงเวลา |
| 11 | Barista Labor & Capacity Planner | Labor seed 0/10 | 4 | 5 | 4 | 5 | 4 | รวม Orders by interval, Prep/service time, Stations, Breaks, Queue capacity และ Loaded labor cost |
| 12 | Coffee Equipment ROI Calculator | ROI seed 0/10 | 4 | 4 | 5 | 4 | 4 | เทียบ Buy/Lease, Throughput, Downtime, Maintenance, Energy, Useful life และ Incremental contribution โดยไม่รับรอง Payback |
| 13 | Coffee Subscription Unit Economics | Related recurring model | 5 | 4 | 5 | 5 | 5 | รวม Roast/pack/ship, Discount, Churn, Failed payment, CAC และ Contribution cohort ต้องมีข้อมูลหลายงวด |
| 14 | Coffee Waste & Actual-vs-Theoretical Variance | Waste seed 0/10 | 5 | 5 | 4 | 5 | 5 | เทียบ Standard usage กับ Purchase/Count/Sales, Dial-in, Comp และ Spill โดยต้องนิยาม Period/Cutoff |
| 15 | Coffee Shop COGS Calculator | COGS 1/10 | 4 | 4 | 4 | 4 | 3 | Workflow งวดบัญชีมี COGS Calculator แล้ว ควรเพิ่มลิงก์/คำอธิบายแทน Duplicate page |

Batch 52 ใช้ `Usable quantity = Purchase quantity × Yield %`, `Ingredient line cost = Purchase cost × Usage per cup ÷ Usable quantity`, `Ingredient cost per cup = Bean + Milk + Extras`, `Ingredient cost % = Ingredient cost per cup ÷ Selling price × 100` และ `Target price = Ingredient cost per cup ÷ Target ingredient cost %` ส่วน Packaging, Direct labor, Payment/Channel fee และ Other direct cost แยกจาก Ingredient cost แล้วรวมเป็น Total direct cost เพื่อไม่ให้คำจำกัดความปนกัน

แผนรายเดือนใช้ `Monthly cups = Average cups/day × Operating days`, `As-purchased usage per cup = Recipe usage ÷ Yield` และ `Monthly packs = As-purchased usage per cup × Monthly cups ÷ Pack quantity` แสดงจำนวนแพ็กแบบทศนิยมเพื่อวางแผน ผู้ใช้ยังต้องปัดตาม Pack size, หัก Stock on hand และตรวจ Lead time ก่อนสั่งซื้อจริง Monthly contribution = Revenue − Direct costs ที่กรอกเท่านั้น ไม่ใช่ Net profit หรือ Forecast

Cost Control for the Hospitality Industry อธิบาย Standardized recipe, AP/EP, Yield และ Portion cost; Specialty Coffee Association แยก Ground coffee brewing ratio/Dose จาก Espresso beverage ratio; NIST ยืนยันรูปแบบ SI ของ g/kg และ mL/L หน้าเครื่องมือจึงให้ผู้ใช้กำหนด Dose/Yield จริง ไม่เดา Recipe benchmark รองรับเมนูไม่มีนม แยกหนึ่งเมนู/ขนาดต่อครั้ง และไม่ใช้ Espresso output แทน Dose เมล็ด

UI แบ่ง Menu/Price/Volume plan, Beans/Dose, Optional milk, Extra ingredients และ Direct costs ใช้ Label gap สม่ำเสมอ, Responsive editor, Cost composition, Pricing status, Recipe table, Monthly purchase plan, Formula panel, Error state และ CSV ทุกข้อมูลคำนวณใน Browser ไม่มี API หรือ LocalStorage ชื่อเมนู/ส่วนผสมใน CSV ถูกป้องกัน Spreadsheet Formula Injection และหน่วยเงินไม่มี FX conversion

- [Google Autocomplete — coffee cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=coffee%20cost%20calculator)
- [Google Autocomplete — coffee cost per cup calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=coffee%20cost%20per%20cup%20calculator)
- [Google Autocomplete — coffee roasting calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=coffee%20roasting%20calculator)
- [Google Autocomplete — coffee profit calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=coffee%20profit%20calculator)
- [Google Autocomplete — คำนวณต้นทุนกาแฟ](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B8%95%E0%B9%89%E0%B8%99%E0%B8%97%E0%B8%B8%E0%B8%99%E0%B8%81%E0%B8%B2%E0%B9%81%E0%B8%9F)
- [Cost Control for the Hospitality Industry — Standardized Recipe and Yield](https://resources.escoffier.edu/ge130/dopson/dopson_c05.pdf)
- [Specialty Coffee Association — Brewing Ratio vs Beverage Ratio](https://sca.coffee/sca-news/25/issue-9/english/water-and-coffee-acidity-how-to-adapt-your-water-for-different-extraction-methods-25-magazine-issue-9-pxjby)
- [NIST — SI Units Volume](https://www.nist.gov/pml/owm/si-units-volume)
- [NIST — SI Units Mass](https://www.nist.gov/pml/owm/si-units-mass)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central Blog — Doorway pages](https://developers.google.com/search/blog/2015/03/an-update-on-doorway-pages)

## รอบที่ 43 — Coffee Roasting Cost, Weight Loss และ Roastery Planning (9 สิงหาคม 2569)

รอบนี้ส่งคำตั้งต้น 60 รูปแบบไปยัง Google Autocomplete ภาษาไทย/ประเทศไทย ครอบคลุม `coffee roasting calculator`, Cost, Weight loss, Yield, Batch, Profit, Pricing, Capacity, Inventory, Wholesale, Energy, Break-even, Blend และคำไทย ได้คำแนะนำรวม 13 รายการหรือ 9 รายการไม่ซ้ำ สัญญาณตรงที่พบคือ `coffee roasting calculator`, `coffee roasting cost calculator` และ `coffee roasting weight loss calculator` อย่างละ 1/9 คำแนะนำไม่ซ้ำ จึงเป็น Long-tail เชิงวิชาชีพที่ Intent ชัด แต่ไม่ควรอ้างว่าเป็นคำปริมาณสูง คะแนนนี้เป็น Autocomplete demand proxy ไม่ใช่ Search Volume และไม่รับประกันอันดับ Google

หน้าเดียวรวม Roast loss, Yield, Green coffee cost, Energy, Direct labor, Other batch cost, Cost per roasted kg, Retail bag cost, Channel fee, Target contribution price และ Monthly roastery scenario เพราะใช้ Input/Output mass และต้นทุน Batch ชุดเดียวกัน ไม่สร้างหน้าบางแยกคำ Cost, Weight loss, Yield, Free หรือ Online เพื่อลด Keyword cannibalization และความเสี่ยง Doorway page ส่วน Coffee shop break-even, Extraction yield/TDS, Multi-menu inventory และ Wholesale tier pricing แยกไว้ เพราะต้องใช้ Fixed cost/Product mix, Beverage mass/TDS, Recipe หลายเมนู หรือ Channel/MOQ workflow คนละชุด

คะแนน 5 คือสูงที่สุด การจัดอันดับพิจารณา Demand ที่พบ, คุณค่าผู้ใช้จริง, ความต่างจาก 79 tools เดิม, ความโปร่งใสของสูตร, Revenue opportunity, Scalability, Innovation และความเสี่ยงจากการตีความข้อมูลผิด:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Coffee Roasting Cost & Weight Loss Calculator | Exact 3 intents; อย่างละ 1/9 unique suggestions | 5 | 5 | 4 | 5 | 5 | ส่งมอบ Batch 53; Loss/Yield, Batch cost, Cost/kg/bag, Pricing, Monthly scenario และ CSV |
| 2 | Coffee Shop Profit & Break-even Calculator | Profit intent 3/10 จากรอบ 42 | 5 | 5 | 5 | 5 | 4 | รวม Product mix, Fixed/Variable cost, Rent/Labor, Capacity และ Break-even cups โดยไม่ใช้ Contribution แทน Net profit |
| 3 | Multi-size Coffee Menu Pricing | Pricing intent 2/10 จากรอบ 42 | 4 | 5 | 5 | 5 | 4 | เทียบ S/M/L Dose, Milk, Packaging, Price ladder และ Margin โดยไม่ใช้ Recipe เดียวทุก Size |
| 4 | Coffee Extraction Yield & Dose Calculator | Dose/Yield 2/10 จากรอบ 42 | 5 | 5 | 4 | 5 | 5 | แยก Ground dose, Beverage mass, TDS, Extraction yield และ Brew ratio พร้อมข้อจำกัดเครื่องมือวัด |
| 5 | Cold Brew Batch Cost Calculator | Exact seed 0/10 | 4 | 5 | 4 | 5 | 4 | ใช้ Coffee/water ratio, Steeping loss, Concentrate yield, Dilution, Bottle และ Servings |
| 6 | Coffee Inventory Usage & Reorder Planner | Direct seed 0/10 | 5 | 5 | 5 | 5 | 4 | ใช้ Sales mix หลายเมนู, On-hand, Lead time, Pack size และ Waste ไม่ใช้เมนูเดียวแทนทั้งร้าน |
| 7 | Coffee Ingredient Price Impact & Supplier Comparison | Related cost intent | 4 | 5 | 4 | 5 | 4 | เปรียบเทียบราคา MOQ, Freight, Yield และผลต่อหลายเมนูพร้อม Scenario audit trail |
| 8 | Coffee Wholesale & Channel Pricing | Wholesale/price seed ต่ำ | 5 | 5 | 5 | 5 | 4 | ใช้ Roast cost เดิมต่อยอด Retail/Wholesale tiers, MOQ, Fulfillment และ Distributor margin |
| 9 | Coffee Menu Engineering | Related profit intent | 5 | 5 | 5 | 5 | 5 | ใช้ Sales mix + Contribution หลายเมนูแบ่ง Popularity/Profitability และวัดผลราคา |
| 10 | Barista Labor & Capacity Planner | Labor/capacity seed ต่ำ | 4 | 5 | 4 | 5 | 4 | รวม Orders by interval, Prep/service time, Stations, Breaks และ Loaded labor cost |
| 11 | Coffee Equipment ROI Calculator | ROI seed ต่ำ | 4 | 4 | 5 | 4 | 4 | เทียบ Buy/Lease, Throughput, Downtime, Maintenance, Energy และ Useful life โดยไม่รับรอง Payback |
| 12 | Coffee Subscription Unit Economics | Related recurring model | 5 | 4 | 5 | 5 | 5 | รวม Roast/pack/ship, Discount, Churn, Failed payment และ CAC เป็น Cohort contribution |
| 13 | Coffee Waste & Actual-vs-Theoretical Variance | Waste seed ต่ำ | 5 | 5 | 4 | 5 | 5 | เทียบ Standard usage กับ Purchase/Count/Sales, Dial-in, Comp และ Spill โดยนิยาม Period/Cutoff |
| 14 | Green Coffee Blend Cost Calculator | Blend seed ต่ำ | 4 | 4 | 4 | 4 | 4 | รวม Origin lots, Blend ratio, Moisture/Yield scenario และ Weighted green/roasted cost โดยไม่ทำนาย Flavor |
| 15 | Coffee Packaging MOQ & Reorder Calculator | Packaging seed ต่ำ | 4 | 4 | 4 | 5 | 3 | ใช้ Bag/Valve/Label MOQ, Lead time, Safety stock และ Working capital แยกจาก Roast economics |

Batch 53 ใช้ `Roast loss % = (Green input − Roasted output) ÷ Green input × 100`, `Roast yield % = Roasted output ÷ Green input × 100`, `Green cost per batch = Purchase cost ÷ Purchase weight × Green input`, `Process cost = Green + Energy + Labor + Other`, `Roasted cost/kg = Process cost ÷ Roasted output kg` และ `Target bag price = Cost before fee ÷ (1 − Channel fee rate − Target contribution margin rate)`

จำนวนถุงเต็มใช้ Floor ของ `Roasted output g ÷ Bag size g` และแสดงน้ำหนักที่เหลือเป็น Inventory ไม่ตีความเป็นของเสีย รายได้และ Batch contribution จึงนับเฉพาะถุงเต็ม แต่หัก Process cost ทั้ง Batch เป็นมุมมองอนุรักษนิยม Monthly scenario เพียงคูณค่าต่อ Batch ด้วยจำนวน Batch ที่ผู้ใช้กรอก ไม่ใช่ Forecast, Capacity plan หรือ Purchase order

งานทดลองด้าน Heat/Mass transfer วัดน้ำหนักก่อนและหลังคั่วเป็นตัวแปรกระบวนการ งานตัวอย่างอีกชุดรายงาน Light 12.7±0.7%, Medium 14.2±0.7% และ Dark 16.9±0.6% ภายใต้เมล็ดและเงื่อนไขเฉพาะ ขณะที่งานอีกชุดพบช่วงกว้าง 2.70–20.98% ตามอุณหภูมิและเวลา หน้าเครื่องมือจึงไม่กำหนด Roast level หรือคุณภาพจาก Loss อัตโนมัติ แต่เปรียบเทียบกับ Loss plan ของผู้ใช้เป็น percentage points เท่านั้น

UI แบ่ง Green coffee/Batch, Post-roast measurement, Energy/Labor และ Packaging/Pricing ใช้ Label gap สม่ำเสมอ, g/kg conversion, Responsive cost table, Loss comparison, Monthly scenario, Formula panel, Error state และ CSV ทุกข้อมูลคำนวณใน Browser ไม่มี API หรือ LocalStorage ชื่อ Batch ใน CSV ถูกป้องกัน Spreadsheet Formula Injection และหน่วยเงินไม่มี FX conversion

- [Google Autocomplete — coffee roasting calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=coffee%20roasting%20calculator)
- [Google Autocomplete — coffee roasting cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=coffee%20roasting%20cost%20calculator)
- [Google Autocomplete — coffee roasting weight loss calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=coffee%20roasting%20weight%20loss%20calculator)
- [Journal of Food Engineering — Analysis of heat and mass transfer during coffee batch roasting](https://www.sciencedirect.com/science/article/abs/pii/S0260877406000239)
- [Journal of Food Composition and Analysis — Roast degree and measured weight loss in one experiment](https://www.sciencedirect.com/science/article/abs/pii/S0889157506001876)
- [Food Chemistry — Weight loss across roasting conditions](https://www.sciencedirect.com/science/article/abs/pii/S0308814622000243)
- [NIST — SI Units Mass](https://www.nist.gov/pml/owm/si-units-mass)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central Blog — Doorway pages](https://developers.google.com/search/blog/2015/03/an-update-on-doorway-pages)

## รอบที่ 44 — Business Break-even, Contribution Margin และ Cost–Volume–Profit (9 สิงหาคม 2569)

รอบนี้ส่งคำตั้งต้น 60 รูปแบบไปยัง Google Autocomplete ภาษาไทย/ประเทศไทย ครอบคลุม Break-even, Contribution margin, Fixed/Variable cost, Target profit, Margin of safety, Product mix, Profit, Cash flow, ROI และ Vertical ธุรกิจ ได้คำแนะนำรวม 212 รายการไม่ซ้ำ จำนวนคำแนะนำเป็น Demand proxy ของความกว้าง Intent เท่านั้น ไม่ใช่ Search volume, Traffic forecast หรือหลักฐานว่าจะติดหน้าแรก Google

สัญญาณกว้างที่สุดคือ `break even calculator`, `break even point calculator`, `contribution margin calculator`, `variable cost calculator`, `business profit calculator`, `payback period calculator`, `ecommerce profit calculator`, `etsy profit calculator` และ `shopify profit calculator` ได้ 10/10 แต่คำ Break-even กว้างมี Social Security, Mortgage, Pension และ ROAS ปน ขณะที่ `break even analysis calculator` ได้ 9/10, `unit economics calculator` และ `restaurant profit calculator` 8/10, `break even sales calculator` 7/10, `equipment roi calculator` 6/10, `คำนวณจุดคุ้มทุน` 5/10 แต่มี Solar cell ปน, `business break even calculator` 3/10 และ `coffee shop profit calculator` 2/10 ส่วน `coffee shop break even calculator` ไม่เกิดคำแนะนำในรอบนี้

จึงใช้ URL เดียว `break-even-calculator` รวม Break-even point, Contribution margin, Fixed/Variable cost, Break-even units/revenue, Target operating profit, Margin of safety, Multi-product mix, Capacity และกราฟ CVP เพราะใช้แกน Input/สูตรเดียวกัน ไม่สร้างหน้า Coffee shop, Restaurant, Service, Free, Online, Excel หรือ Graph แยกซ้ำเพื่อไล่ Keyword ส่วน Payback period, Unit economics และ Cash-flow forecast แยกไว้ เพราะต้องใช้ Investment/cash-flow timing, CAC/LTV หรือ Opening balance/credit terms คนละ Workflow

คะแนน 5 คือสูงที่สุด การจัดอันดับพิจารณา Demand ที่พบ, คุณค่าผู้ใช้จริง, ความต่างจาก 80 tools เดิม, ความโปร่งใสของสูตร, Revenue opportunity, Scalability, Innovation และความเสี่ยงจากการตีความข้อมูลผิด:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Business Break-even & CVP Calculator | Break-even/Point 10/10; Analysis 9/10; ไทย 5/10 | 5 | 5 | 5 | 5 | 5 | ส่งมอบ Batch 54; Single/Multi-product, Unit mix, Fixed/Variable, Target, Safety, Capacity, Graph และ CSV |
| 2 | Contribution Margin Calculator | 10/10 | 3 | 5 | 5 | 5 | 3 | Formula/Ratio/Unit/Weighted intent รวมใน Batch 54 แล้ว ไม่สร้างหน้าบางซ้ำ |
| 3 | Payback Period & Discounted Payback Calculator | 10/10 | 5 | 5 | 5 | 5 | 4 | ผู้สมัคร Batch ถัดไป; ต้องรองรับ Irregular cash flow, Timing, Discount rate และเปรียบเทียบกับ NPV โดยไม่รับรองการลงทุน |
| 4 | Unit Economics Calculator | 8/10 | 5 | 5 | 5 | 5 | 5 | รวม Revenue/Order, Variable fulfillment, Contribution, CAC, LTV:CAC และ Payback โดยแยก Cohort assumption |
| 5 | Restaurant Profit & Prime Cost Calculator | 8/10 | 5 | 5 | 5 | 5 | 4 | ใช้ Period sales, COGS, Labor, Occupancy และ Other Opex ไม่ใช้ Food cost ต่อเมนูแทน P&L |
| 6 | Equipment ROI & Buy-vs-Lease Calculator | 6/10 | 5 | 5 | 5 | 5 | 4 | รวม Incremental cash flow, Maintenance, Downtime, Useful life และ Residual value พร้อม Sensitivity |
| 7 | Cash-flow Forecast Calculator | 3/10 | 5 | 5 | 5 | 5 | 5 | ต้องมี Opening cash, Receivable/Payable timing, Recurring items, Minimum cash และไม่ใช้ Profit แทน Cash |
| 8 | Small-business Profit Scenario | Business profit 10/10; Small business 4/10 | 4 | 5 | 5 | 5 | 4 | ต้องรวม Revenue streams, COGS/Opex และ Scenario โดยไม่ซ้ำ Profit Margin ต่อหน่วยหรือ Project Profit |
| 9 | E-commerce Order Profit Calculator | 10/10 แต่ India/App/Extension intent ปน | 4 | 5 | 5 | 5 | 4 | รวม Product cost, Payment fee, Shipping, Returns, Ad spend และ Tax basis โดยไม่ผูก Platform เดียว |
| 10 | Restaurant Break-even & Capacity Planner | Break-even 1/10; Profit 8/10 | 4 | 5 | 5 | 5 | 4 | Generic workflow รวม Batch 54 แล้ว ค่อยแยกเมื่อมี Seats/Turnover/Daypart/Product mix ที่ต่างจริง |
| 11 | Margin of Safety & Operating Leverage | Related CVP intent | 4 | 5 | 4 | 5 | 4 | Margin of safety รวม Batch 54; Operating leverage ต้องมี Actual volume และ warning เมื่อ Profit ใกล้ศูนย์ |
| 12 | Fixed/Variable/Mixed Cost Splitter | Variable cost 10/10 | 5 | 4 | 4 | 5 | 5 | ต้องใช้หลายงวดและวิธี High-low/Regression พร้อม Outlier/causality warning ไม่ควรเดาจากงวดเดียว |
| 13 | Multi-product Sales Mix Optimizer | Weighted CM 0–3/10 | 5 | 5 | 4 | 5 | 5 | Batch 54 วิเคราะห์ Mix ที่กำหนด แต่ Optimizer ต้องเพิ่ม Demand/Capacity/Constraint และ Linear programming |
| 14 | Marketplace Profit Calculator | Etsy/Shopify 10/10 | 5 | 4 | 5 | 4 | 4 | Fee/Tax/Country/Plan เปลี่ยนเร็ว ต้อง Version rules หรือให้ผู้ใช้กรอกอัตราเอง ไม่อ้างค่าปัจจุบันโดยไม่ตรวจ |
| 15 | Service-business Capacity Break-even | Exact 1–3/10 | 4 | 5 | 4 | 5 | 4 | Batch 54 ใช้หน่วยบริการได้แล้ว งานแยกต้องมี Billable utilization, Staffing tiers และ Queue/appointment constraint |

Batch 54 ใช้ `Contribution per unit = Selling price − Variable cost per unit`, `Weighted contribution = Σ(Unit mix × Contribution per unit)`, `Break-even units = Fixed costs ÷ Weighted contribution`, `Break-even revenue = Fixed costs ÷ Weighted contribution margin ratio` และ `Target units = (Fixed costs + Target operating profit) ÷ Weighted contribution` Product mix เป็นสัดส่วนจำนวนหน่วยและต้องรวม 100% ไม่ใช่ Revenue share

Current scenario ใช้ `Revenue = Current total units × Weighted price`, `Operating profit = Contribution − Fixed costs` และ `Margin of safety % = (Current revenue − Break-even revenue) ÷ Current revenue × 100` ส่วน Capacity scenario เทียบ Break-even/Target units กับจำนวนหน่วยสูงสุดที่ผู้ใช้กรอก ไม่จำลอง Step cost, Queue, Demand หรือ Production bottleneck อัตโนมัติ

U.S. Small Business Administration อธิบายสูตร Break-even units/sales dollars และการแยก Fixed, Variable และ Semi-variable cost ส่วน OpenStax อธิบาย Contribution margin, Target operating profit, Composite unit และข้อสมมติว่า Sales mix คงที่สำหรับ Multi-product CVP หน้าเครื่องมือจึงแสดง Exact/rounded units แยกกัน, ยอมให้เห็น Loss-leader รายการเดี่ยวแต่หยุดเมื่อ Weighted contribution ไม่เป็นบวก และเรียกผลหลังหัก Fixed cost ที่กรอกว่า Operating profit ไม่ใช่ Net profit

UI แบ่ง Scenario, Fixed costs, Product/service cards, Unit mix badge, Current/Target/Capacity ใช้ Label gap สม่ำเสมอ, Responsive cards, ตารางเลื่อนภายใน, กราฟ SVG ที่มี title/description, Formula panel, Error state และ CSV ทุกข้อมูลคำนวณใน Browser ไม่มี API หรือ LocalStorage ชื่อ Scenario/สินค้าใน CSV ถูกป้องกัน Spreadsheet Formula Injection และหน่วยเงินไม่มี FX conversion

- [Google Autocomplete — break even point calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=break%20even%20point%20calculator)
- [Google Autocomplete — contribution margin calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=contribution%20margin%20calculator)
- [Google Autocomplete — variable cost calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=variable%20cost%20calculator)
- [Google Autocomplete — คำนวณจุดคุ้มทุน](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B8%88%E0%B8%B8%E0%B8%94%E0%B8%84%E0%B8%B8%E0%B9%89%E0%B8%A1%E0%B8%97%E0%B8%B8%E0%B8%99)
- [U.S. Small Business Administration — Break-even point](https://www.sba.gov/business-guide/plan-your-business/calculate-your-startup-costs/break-even-point)
- [OpenStax — Calculate a Break-even Point in Units and Dollars](https://openstax.org/books/principles-managerial-accounting/pages/3-2-calculate-a-break-even-point-in-units-and-dollars)
- [OpenStax — Multi-product Break-even and Sales Mix](https://openstax.org/books/principles-managerial-accounting/pages/3-4-perform-break-even-sensitivity-analysis-for-a-multi-product-environment-under-changing-business-situations)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central Blog — Doorway pages](https://developers.google.com/search/blog/2015/03/an-update-on-doorway-pages)

## รอบที่ 45 — Payback Period, Discounted Payback และ NPV Timeline (9 สิงหาคม 2569)

รอบนี้ส่งคำตั้งต้น 60 รูปแบบไปยัง Google Autocomplete ภาษาไทย/ประเทศไทย ครอบคลุม Payback period, Discounted payback, Cash flow, NPV, IRR, Capital budgeting, Investment appraisal, Equipment, Business และคำไทย ได้คำแนะนำ 222 รายการไม่ซ้ำ โดยไม่มี Request error จำนวนคำแนะนำเป็น Demand proxy ของความกว้าง Intent เท่านั้น ไม่ใช่ Search volume, Traffic forecast หรือหลักฐานว่าจะติดหน้าแรก Google

สัญญาณตรง `payback period calculator` ได้ 10/10 พร้อม Excel, Formula, Irregular cash flows, Online, Months และ No discount rate; `discounted payback calculator` 8/10; `discounted payback period calculator` 6/10; `investment payback calculator` 4/10; `project payback calculator` 3/10 และคำไทย `ระยะเวลาคืนทุน สูตร` 6/10 ส่วน `คำนวณระยะเวลาคืนทุน` และ `คำนวณ payback period` ได้ 1/10 ขณะเดียวกัน NPV, IRR, Discounted cash flow และ Present value ได้ 10/10 แต่มี Intent ประเมินหุ้น ประกัน เงินกู้และ Pension ปน จึงไม่รวม IRR หรือ DCF valuation ที่ต้องมี Workflow และข้อจำกัดต่างกัน

ใช้ URL เดียว `payback-period-calculator` รวม Simple payback, Discounted payback, Uneven periodic cash flow, Monthly/Quarterly/Yearly interval, Effective annual discount rate, Terminal value, NPV, Cumulative cash-flow chart, Timeline และ CSV ไม่สร้างหน้า Free, Online, Excel, Formula, Months, Project, Equipment หรือภาษาไทยแยกซ้ำ ส่วน IRR/MIRR, Stock DCF valuation, Profitability index, Buy-vs-lease และ Cash-flow forecast แยกไว้ เพราะมี Multiple-root, Terminal growth, Financing, Mutually-exclusive project หรือ Receivable/Payable timing คนละ Workflow

คะแนน 5 คือสูงที่สุด การจัดอันดับพิจารณา Demand ที่พบ, คุณค่าผู้ใช้จริง, ความต่างจาก 81 tools เดิม, ความโปร่งใสของสูตร, Revenue opportunity, Scalability, Innovation และความเสี่ยงจากการใช้ผลตัดสินใจลงทุน:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Payback Period & Discounted Payback Calculator | Payback 10/10; Discounted 6–8/10; ไทย 6/10 | 5 | 5 | 5 | 5 | 4 | ส่งมอบ Batch 55; Uneven CF, Effective rate, Terminal value, NPV, Graph, Timeline และ CSV |
| 2 | NPV & Capital Budgeting Calculator | NPV 10/10; Capital budgeting 2/10 | 5 | 5 | 5 | 5 | 4 | NPV เบื้องต้นรวม Batch 55 แล้ว งานแยกควรมีหลายโครงการ, Mutually exclusive, Capital rationing และ Sensitivity |
| 3 | IRR & MIRR Calculator | IRR 10/10 | 5 | 5 | 5 | 5 | 5 | ต้องตรวจ Multiple roots, No-root, Reinvestment rate และแสดง NPV profile ไม่ส่งเลขเดียวแบบไร้คำเตือน |
| 4 | Equipment ROI & Replacement Analysis | Equipment ROI 6/10 | 5 | 5 | 5 | 5 | 5 | ใช้ Incremental cash flow, Downtime, Maintenance, Tax depreciation, Residual value และ Defender/Challenger |
| 5 | Profitability Index & Capital Rationing | PI 9/10 | 5 | 5 | 4 | 5 | 4 | ใช้ PV benefits/PV costs พร้อม Budget constraint และ Ranking โดยไม่ใช้ PI แทน NPV ใน Mutually exclusive projects |
| 6 | Cash-flow Forecast Calculator | Project cash flow 3/10 | 5 | 5 | 5 | 5 | 5 | ต้องมี Opening cash, AR/AP timing, Recurring items, Tax/VAT, Minimum cash และ Scenario ไม่ใช้ Profit แทน Cash |
| 7 | Investment Appraisal Comparison | Exact 2/10 | 5 | 5 | 5 | 5 | 5 | เทียบ Payback, Discounted payback, NPV, IRR, PI และ ARR หลายโครงการบน Horizon/Discount basis เดียวกัน |
| 8 | Discount Rate & WACC Worksheet | Discount rate 10/10 | 5 | 5 | 5 | 5 | 4 | ต้องแยก Cost of equity/debt, Tax shield, Capital weights และ Country/size risk โดยไม่สร้างอัตราแนะนำอัตโนมัติ |
| 9 | Project Cash-flow Scenario Builder | Exact 3/10 | 5 | 5 | 4 | 5 | 5 | สร้าง Base/Upside/Downside, Probability, Working capital และ Terminal assumption พร้อม Audit trail |
| 10 | Buy-vs-Lease Equipment Calculator | Buy vs lease 2/10 | 5 | 5 | 5 | 5 | 4 | ต้องเทียบ After-tax incremental cash flows, Financing, Maintenance, Residual value และ Ownership risk |
| 11 | Solar/Energy Payback Calculator | Solar 10/10; Energy 3/10 | 5 | 4 | 5 | 5 | 4 | Demand สูงแต่ต้องมี Tariff, Degradation, Export credit, Maintenance และ Location rules ที่เปลี่ยนได้ ไม่ใช้ Generic payback แทน |
| 12 | Initial Investment Outlay Calculator | 10/10 แต่ Compound/SIP intent ปน | 4 | 4 | 4 | 5 | 3 | รวม Purchase, Installation, Training, Working capital, Disposal/tax effect โดยต้องแยกจาก Investment growth intent |
| 13 | Capital Recovery Factor Calculator | 5/10 | 4 | 4 | 4 | 4 | 3 | ใช้ Annualized capital cost/Equivalent annual cost เหมาะกับโครงการอายุไม่เท่ากัน แต่ต้องระบุ Nominal/Effective rate |
| 14 | Business Investment Scenario | Business investment 8/10 | 5 | 4 | 5 | 5 | 4 | ต้องรวม Revenue/Cost drivers, Funding, Working capital และ Owner salary ไม่ทำ Generic ROI หน้าใหม่ซ้ำ |
| 15 | Restaurant/Coffee Equipment Payback | Exact seed 0/10 | 4 | 4 | 4 | 4 | 4 | Generic Payback รองรับแล้ว งานแยกควรมี Throughput, Menu contribution, Labor saving, Downtime และ Capacity จริงก่อนสร้าง URL |

Batch 55 เริ่มยอดสะสมที่ `−Initial investment`, Simple payback สะสม Net cash flow ตามลำดับ ส่วน Discounted payback ใช้ `Periodic rate = (1 + Effective annual rate)^(1 ÷ Periods per year) − 1` และ `Discounted CF_t = CF_t ÷ (1 + Periodic rate)^t` ก่อนสะสม Terminal value จะรวมเฉพาะงวดสุดท้ายและ NPV = PV ของกระแสเงินสดอนาคตทั้งหมด − เงินลงทุนเริ่มต้น

เศษงวดใช้ `Completed periods + Unrecovered balance before recovery period ÷ Recovery-period cash flow` ตามวิธี Payback ทั่วไปและระบุสมมติฐานว่าเงินสดเกิดสม่ำเสมอภายในงวด รองรับ Cash flow ติดลบแต่เตือนเมื่อยอดสะสมกลับมาติดลบหลังการคืนทุนครั้งแรก ไม่ใช้ Payback แทน Profitability เพราะวิธีนี้ไม่ให้คุณค่ากับ Cash flow หลังคืนทุน และไม่เรียก NPV ว่า IRR หรืออัตราผลตอบแทน

OpenStax Principles of Finance 2e อธิบาย Payback เป็นเวลาที่ Free cash flow คืน Initial cost และข้อจำกัดเรื่อง Time value of money; บท Alternative Methods อธิบายการ Discount กระแสเงินสดด้วย Cost of funds, สะสมจนคืนทุน และหาเศษงวด แต่ยังไม่มี Objective payback cutoff และยังละเลย Cash flow หลังคืนทุน หน้าเครื่องมือจึงแสดง Simple/Discounted/NPV ควบคู่กัน ไม่ให้คำแนะนำลงทุน และใช้เป้าคืนทุนของผู้ใช้เป็น Comparison เท่านั้น

UI แบ่ง Scenario/Investment, Net cash flow editor, Result cards, Accessible SVG chart, Timeline แบบการ์ดบนมือถือ/ตารางบนจอใหญ่, Formula panel, Warning state และ CSV ใช้ Label gap สม่ำเสมอ ทุกข้อมูลคำนวณใน Browser ไม่มี API หรือ LocalStorage ชื่อ Scenario/งวดใน CSV ถูกป้องกัน Spreadsheet Formula Injection และหน่วยเงินไม่มี FX conversion

- [Google Autocomplete — payback period calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=payback%20period%20calculator)
- [Google Autocomplete — discounted payback calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=discounted%20payback%20calculator)
- [Google Autocomplete — ระยะเวลาคืนทุน สูตร](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%A3%E0%B8%B0%E0%B8%A2%E0%B8%B0%E0%B9%80%E0%B8%A7%E0%B8%A5%E0%B8%B2%E0%B8%84%E0%B8%B7%E0%B8%99%E0%B8%97%E0%B8%B8%E0%B8%99%20%E0%B8%AA%E0%B8%B9%E0%B8%95%E0%B8%A3)
- [Google Autocomplete — NPV calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=npv%20calculator)
- [OpenStax Principles of Finance 2e — Payback Period Method](https://openstax.org/books/principles-of-finance-2e/pages/16-1-payback-period-method)
- [OpenStax Principles of Finance 2e — Discounted Payback Period](https://openstax.org/books/principles-of-finance-2e/pages/16-4-alternative-methods)
- [OpenStax — Net Present Value Method](https://openstax.org/books/principles-finance/pages/16-2-net-present-value-npv-method)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central — How Search works and no indexing guarantee](https://developers.google.com/search/docs/fundamentals/how-search-works)

## รอบที่ 50 — Unit Price, Price per Weight/Volume/Count และ Pack Comparison (9 สิงหาคม 2569)

รอบนี้ส่งคำตั้งต้น 20 รูปแบบไปยัง Google Autocomplete ภาษาไทย/ประเทศไทย ครอบคลุม Unit price, Price per unit, kg, g, 100 g, oz, lb, mL, L/litre, fluid ounce, item, bulk, discount, grocery และคำไทย ได้คำแนะนำ 95 รายการไม่ซ้ำ ไม่มี Request error และมี 6 คำตั้งต้นที่คืนผลเต็ม 10/10 จำนวนคำแนะนำเป็น Demand proxy ของความกว้าง Intent เท่านั้น ไม่ใช่ Search volume, Traffic forecast หรือหลักฐานว่าจะติดหน้าแรก Google

สัญญาณตรง `unit price calculator`, `price per unit calculator`, `price per kg calculator`, `price per pound calculator` และ `price per litre calculator` ได้ 10/10; `compare unit price` ได้ 10/10 แต่มี Intent ค่าไฟ/พื้นที่เก็บของปน; `price per ml calculator` 7/10; `price per liter calculator` 6/10; `price per oz calculator` และ `bulk price calculator` 5/10; `price per gram calculator` และ `price per item calculator` 3/10; `price per 100g calculator` 2/10; `price per fluid ounce calculator`, `discount unit price calculator`, `grocery unit price calculator` และ `คำนวณราคาต่อหน่วย` ได้ 1/10 ส่วน `compare package size calculator` และ `เปรียบเทียบราคาต่อหน่วย` ได้ 0/10 ในรอบนี้

ใช้ URL เดียว `unit-price-comparison-calculator` รวม Price per unit, kg, 100 g, oz, lb, mL, L/litre, fl oz, item, Multipack, Bulk, Discount, Coupon และ Shipping ไม่สร้างหน้า Free, Online, App, UK, India หรือแต่ละหน่วยแยกซ้ำ เพราะทั้งหมดเป็น Workflow เดียวและเสี่ยงเป็น Doorway pages หน้าเดิม `unit-converter` คงหน้าที่แปลงค่าระหว่างหน่วย ส่วนหน้าใหม่นำราคา ปริมาณ และค่าใช้จ่ายมาจัดอันดับความคุ้มค่าจึงไม่แย่ง Primary intent กัน

คะแนน 5 คือสูงที่สุด การจัดอันดับพิจารณา Demand ที่พบ, คุณค่าผู้ใช้จริง, ความต่างจาก 86 tools เดิม, Revenue opportunity, Technical complexity, Scalability, Innovation และความเสี่ยงจากการชี้นำให้ซื้อเกินความจำเป็น:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Unit Price Comparison Calculator | Core 10/10 หลายแกน; 95 suggestions | 4 | 5 | 5 | 5 | 4 | Batch 60; 2–20 รายการ, Weight/Volume/Count, Multipack, Discount, Coupon, Shipping, Ranking และ CSV |
| 2 | Grocery Price per Weight Comparator | kg 10/10; g 3/10; 100 g 2/10 | 3 | 5 | 5 | 5 | 3 | Intent และสูตรรวม Batch 60 แล้ว ไม่สร้างหน้าร้านของชำบางซ้ำ |
| 3 | Price per Volume / Beverage Comparator | litre 10/10; mL 7/10; fl oz 1/10 | 4 | 5 | 5 | 5 | 4 | L/mL/fl oz/pint/quart/gallon รวม Batch 60; แยกจาก Drink Cost ที่คำนวณสูตรขายต่อแก้ว |
| 4 | Multipack Price per Item Calculator | Item 3/10; Unit core 10/10 | 3 | 5 | 5 | 5 | 3 | Count และจำนวนแพ็กย่อยรวม Batch 60 แล้ว เหมาะกับทิชชู ผ้าอ้อม แคปซูล และของใช้ |
| 5 | Bulk Buy Break-even & Storage Cost | Bulk 5/10 | 5 | 5 | 5 | 5 | 5 | งานแยกควรมีอัตราใช้ วันหมดอายุ พื้นที่เก็บ เงินจม และ Waste ไม่ใช้ Unit price ต่ำสุดตัดสินแทน |
| 6 | Subscription vs One-time Purchase | Related recurring purchase intent | 5 | 5 | 5 | 5 | 5 | ต้องมีรอบส่ง Membership fee, Skip/cancel, Price changes, Shipping และ Planned usage |
| 7 | Refill vs New Container Comparator | Related refill intent | 4 | 5 | 5 | 5 | 5 | ต้องแยก Container reuse, Refill volume, Deposit และจำนวนรอบ ไม่อ้าง Environment score โดยไร้ข้อมูล |
| 8 | Concentrate Dilution Cost Calculator | Price per volume related | 4 | 5 | 5 | 5 | 5 | ใช้ Dilution ratio, Yield after mix และ Cost per ready-to-use volume คนละ Workflow จากราคาขวดตรง |
| 9 | Marketplace Landed Unit Cost | Discount/Shipping 1–3/10 | 5 | 5 | 5 | 5 | 4 | Batch 60 รวม Shipping แบบยอดคงที่แล้ว งานแยกต้องมี Fee, Tax, Cross-border, Bundle allocation และ Returns |
| 10 | Pet Food Daily Feeding Cost | kg intent สูงแต่ Domain-specific | 5 | 5 | 5 | 5 | 4 | ต้องมี Feeding guide จากฉลาก น้ำหนักสัตว์ Calories และห้ามให้คำแนะนำสุขภาพแทนสัตวแพทย์ |
| 11 | Diaper Cost per Use | Item intent 3/10 | 4 | 4 | 5 | 5 | 4 | Unit price ต่อชิ้นรวม Batch 60 งานแยกควรมี Leakage/waste, Size transition และ Subscription |
| 12 | Tissue Cost per Sheet / Area | Item intent 3/10 | 4 | 4 | 4 | 5 | 4 | ต้องเทียบ Sheet count, Ply และ Sheet dimensions หากต้องการความต่างจริง ไม่ควรใช้จำนวนแผ่นอย่างเดียว |
| 13 | Meal Portion Cost Comparator | Food cost related intent | 5 | 5 | 5 | 5 | 4 | Food Cost Calculator มี Yield/Recipe/Serving แล้ว ไม่สร้างหน้าใหม่จนมี Ready-meal nutrition/portion workflow ที่ต่าง |
| 14 | Store Brand vs Brand Scenario | Compare unit price 10/10 แต่ Brand-specific intent ไม่ชัด | 4 | 4 | 5 | 5 | 4 | Unit price เป็นเพียงหนึ่งแกน ต้องให้ผู้ใช้บันทึกคุณภาพ/ความชอบเองและไม่สรุปว่าแบรนด์ใดดีกว่า |
| 15 | Waste-adjusted Planned-use Value | Related consumer planning intent | 5 | 5 | 4 | 5 | 5 | ผู้สมัครต่อยอดที่มี Planned usage, Spoilage, Shelf life และ Leftover value แต่ต้องหลีกเลี่ยง False precision |

Batch 60 ใช้ `ยอดจ่ายจริง = ราคาหน้าป้าย × (1 − ส่วนลด %) − ส่วนลดคงที่ + ค่าใช้จ่ายเพิ่ม`, `ปริมาณรวมฐาน = จำนวนแพ็ก × ปริมาณต่อแพ็ก × ตัวคูณหน่วย` และ `ราคาต่อฐาน = ยอดจ่ายจริง ÷ (ปริมาณรวมฐาน ÷ ปริมาณฐานเปรียบเทียบ)` โดยหักส่วนลดเปอร์เซ็นต์ก่อนคูปองคงที่และบวกค่าส่งเป็นขั้นสุดท้าย ระบบห้ามคูปองเกินราคาหลังส่วนลดและห้ามยอดจ่ายจริงเป็นศูนย์หรือติดลบเพื่อให้การหารและเปอร์เซ็นต์เทียบมีความหมาย

น้ำหนักใช้กรัมเป็นฐาน โดย 1 oz = 28.349523125 g และ 1 lb = 453.59237 g ปริมาตรใช้ mL เป็นฐาน โดย 1 U.S. fl oz = 29.57353 mL, pint = 473.1765 mL, quart = 946.3529 mL และ gallon = 3785.411784 mL ตามตาราง NIST SP 1020 ส่วน count ใช้ชิ้นเป็นฐาน ระบบปิดการเทียบ kg กับ L เพราะต้องรู้ความหนาแน่นเฉพาะสินค้า ไม่สมมติว่าน้ำหนักเท่าปริมาตร

NIST Handbook 130 ระบุว่าราคาต่อหน่วยของสินค้าในหมวดเดียวกันควรแสดงด้วยหน่วยที่สม่ำเสมอ และยกฐาน kg/100 g, L/100 mL, lb/oz หรือหน่วยปริมาตรที่เหมาะสม NIST อธิบาย Unit pricing ว่าเป็นเครื่องมือช่วยเทียบมูลค่าและรับมือ Package downsizing แต่ไม่ใช่ตัวแทนคุณภาพหรือความเหมาะสม หน้าเครื่องมือจึงแสดงคำเตือนเรื่องคุณภาพ ส่วนผสม วันหมดอายุ พื้นที่เก็บ Membership และของเหลือ ไม่บอกให้ซื้อแพ็กใหญ่โดยอัตโนมัติ

UI แบ่งประเภท Weight/Volume/Count, Settings, Product cards, Optional discount/coupon/shipping panel, Winner cards, Ranking bars, Formula และ Limitations ใช้ Label gap 12 px, Glass cards ที่อ่านได้ทั้ง Light/Dark, Responsive layout และ formula-safe UTF-8 CSV ทุกข้อมูลคำนวณใน Browser ไม่มี API, Cookie หรือ LocalStorage และรองรับ Tie แบบคงลำดับข้อมูลเดิม

- [Google Autocomplete — unit price calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=unit%20price%20calculator)
- [Google Autocomplete — price per unit calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=price%20per%20unit%20calculator)
- [Google Autocomplete — price per kg calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=price%20per%20kg%20calculator)
- [Google Autocomplete — price per ml calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=price%20per%20ml%20calculator)
- [Google Autocomplete — compare unit price](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=compare%20unit%20price)
- [Google Autocomplete — คำนวณราคาต่อหน่วย](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B8%A3%E0%B8%B2%E0%B8%84%E0%B8%B2%E0%B8%95%E0%B9%88%E0%B8%AD%E0%B8%AB%E0%B8%99%E0%B9%88%E0%B8%A7%E0%B8%A2)
- [NIST — Handbook 130 current edition](https://www.nist.gov/pml/owm/nist-handbook-130-current-edition)
- [NIST — Uniform Unit Pricing tools for consumers](https://www.nist.gov/programs-projects/uniform-unit-pricing-tools-consumers-fight-shrinkflation)
- [NIST SP 1020 — Weight and liquid-volume conversion factors](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1020.pdf)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central Blog — Doorway pages](https://developers.google.com/search/blog/2015/03/an-update-on-doorway-pages)
- [Google Search Central — Crawling and indexing FAQ](https://developers.google.com/search/help/crawling-index-faq)

## รอบที่ 46 — IRR, Multiple IRR, MIRR และ NPV Profile (9 สิงหาคม 2569)

รอบนี้ส่งคำตั้งต้น 60 รูปแบบไปยัง Google Autocomplete ภาษาไทย/ประเทศไทย ครอบคลุม IRR, Internal rate of return, MIRR, XIRR, NPV profile, Multiple IRR, Investment, Project, Real estate, Insurance และคำไทย ได้คำแนะนำ 207 รายการไม่ซ้ำ โดยไม่มี Request error จำนวนคำแนะนำเป็น Demand proxy ของความกว้าง Intent เท่านั้น ไม่ใช่ Search volume, Traffic forecast หรือหลักฐานว่าจะติดหน้าแรก Google

สัญญาณตรง `irr calculator`, `internal rate of return calculator`, `mirr calculator`, `rate of return calculator` และ `xirr calculator` ได้ 10/10; `npv and irr calculator` 8/10; `irr calculator investment` 7/10; `irr calculator cash flows` และ `คำนวณ irr` 6/10; `multiple irr calculator` 5/10 และ `modified internal rate of return calculator` 2/10 คำ `irr calculator insurance` ได้ 10/10 แต่มี Product/regulatory assumptions คนละชุด จึงไม่ใช้ Generic calculator แทน ส่วน XIRR/XNPV แยกไว้เพราะต้องใช้วันที่จริงและช่วงเวลาไม่สม่ำเสมอ

ใช้ URL เดียว `irr-calculator` รวม IRR, Multiple/repeated/no-root detection, MIRR, NPV at hurdle rate, NPV profile, Monthly/Quarterly/Yearly interval, Effective annualization, Timeline และ CSV ไม่สร้างหน้า Free, Online, Excel, Formula, Investment หรือ Project แยกซ้ำเพื่อไล่ Keyword และไม่รวม XIRR, Insurance, Real-estate underwriting หรือ Solar model ที่ต้องมี Input และข้อจำกัดเฉพาะ

คะแนน 5 คือสูงที่สุด การจัดอันดับพิจารณา Demand ที่พบ, คุณค่าผู้ใช้จริง, ความต่างจาก 82 tools เดิม, Revenue opportunity, Technical complexity, Scalability, Innovation และความเสี่ยงจากการใช้ผลตัดสินใจลงทุน:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | IRR & MIRR Calculator | IRR/MIRR 10/10 | 5 | 5 | 5 | 5 | 5 | ส่งมอบ Batch 56; ตรวจหลายราก รากซ้ำ ไม่มีราก MIRR, NPV profile, Timeline และ CSV |
| 2 | XIRR & XNPV Date Calculator | XIRR 9–10/10 | 5 | 5 | 5 | 5 | 5 | ผู้สมัครถัดไป; ใช้ Actual dates, Day-count basis และ root diagnostics ไม่ซ่อน Guess failure |
| 3 | NPV & Capital Budgeting Comparison | NPV/IRR 8–10/10 | 5 | 5 | 5 | 5 | 5 | เทียบหลายโครงการบน Hurdle/Horizon เดียว พร้อม Mutually-exclusive และ capital constraint |
| 4 | Real-estate IRR Model | Real estate 3–4/10 | 5 | 5 | 5 | 5 | 4 | ต้องมี Rent, Vacancy, Capex, Debt, Sale cost, Tax boundary และ Levered/Unlevered แยกชัด |
| 5 | Insurance Policy IRR Analyzer | Insurance 10/10 | 5 | 5 | 5 | 4 | 4 | Demand สูงแต่ต้องแยก Premium, Benefit, Surrender, Dividend และไม่ใช้ IRR แทนความเหมาะสมของกรมธรรม์ |
| 6 | Profitability Index & Capital Rationing | Related capital budgeting | 5 | 5 | 5 | 5 | 5 | ใช้ NPV ต่อเงินลงทุนและ Optimizer ภายใต้งบจำกัด พร้อมข้อจำกัดโครงการที่เลือกพร้อมกันไม่ได้ |
| 7 | Equipment Replacement Analysis | Project/equipment related | 5 | 5 | 5 | 5 | 4 | เทียบ Keep/Replace ด้วย Incremental cash flow, Tax, Salvage, Downtime และ Equivalent annual cost |
| 8 | Solar Project IRR Calculator | Solar exact 1/10 | 5 | 5 | 5 | 5 | 4 | ต้องมี Generation, Degradation, Tariff, Export credit, Maintenance และ Location assumption |
| 9 | Private-equity MOIC to IRR | Private equity 1/10 | 4 | 4 | 5 | 4 | 4 | เหมาะ intent เฉพาะ ต้องรองรับ Interim cash flow และเตือนว่า MOIC ไม่สะท้อนเวลา |
| 10 | Investment Appraisal Comparison | Related 2–8/10 | 5 | 5 | 5 | 5 | 5 | รวม NPV, IRR, MIRR, PI, Payback และ Discounted payback โดยไม่สรุปผ่าน/ไม่ผ่านอัตโนมัติ |
| 11 | WACC & Discount-rate Worksheet | Reinvestment/rate related 2–3/10 | 5 | 5 | 5 | 5 | 4 | ต้องแยก Cost of debt/equity, Tax shield, Capital structure และ Source-date ของ Market inputs |
| 12 | Cash-flow Scenario Builder | Cash-flow related 4/10 | 5 | 5 | 4 | 5 | 5 | สร้าง Base/Downside/Upside, Sensitivity และ Export เพื่อนำเข้า IRR/XIRR โดยไม่เรียก Forecast ว่ารับรอง |
| 13 | Buy-vs-Lease Calculator | Related finance intent | 5 | 5 | 5 | 5 | 4 | ใช้ After-tax incremental cash flow, Residual, Maintenance และ Financing timing คนละ Workflow กับ IRR ทั่วไป |
| 14 | Capital Recovery Factor Calculator | Formula intent ต่ำ | 3 | 4 | 3 | 5 | 3 | มีประโยชน์งานวิศวกรรม แต่ควรรวมกับ Equivalent annual cost มากกว่าสร้างหน้าบาง |
| 15 | Venture Project IRR & Dilution Model | Project IRR related | 5 | 4 | 5 | 4 | 5 | ต้องแยก Company cash flow กับ Investor cash flow, Round dilution, Exit และ Preference waterfall |

Batch 56 แปลงสมการ NPV เป็นพหุนาม `P(q) = Σ CF_t q^t` โดย `q = 1 ÷ (1 + r)` และค้นหาเฉพาะ `q > 0` จึงเท่ากับอัตรา `r > -100%` ใช้รากของอนุพันธ์แบ่งช่วง Monotonic ก่อน Bisection และตรวจ Critical point เพื่อจับรากซ้ำที่เพียงสัมผัสแกน ไม่พึ่ง Guess เดียว ช่วงที่ประกาศคือมากกว่า -99.99% ถึง 100,000% ต่องวด และแยกสถานะรากอยู่นอกช่วงเมื่อ Cash flow แบบ Conventional มี Sign change หนึ่งครั้งแต่ไม่พบรากในช่วง

MIRR ใช้ `PV` ของ Cash flow ติดลบที่ Finance rate, `FV` ของ Cash flow บวกที่ Reinvestment rate และ `MIRR = (FV positive ÷ −PV negative)^(1 ÷ Horizon) − 1` อัตรารายปีที่กรอกเป็น Effective annual rate และแปลงต่องวดด้วย `(1 + annual rate)^(1 ÷ periods per year) − 1` การคำนวณทั้งหมดทำใน Browser จำกัด 61 แถวและจำนวนเงินต่อแถว ป้องกัน Spreadsheet Formula Injection ใน CSV และระบุชัดว่าไม่รองรับวันที่ไม่สม่ำเสมอ

OpenStax อธิบาย IRR เป็นอัตราที่ทำให้ NPV เท่ากับศูนย์, NPV profile, กรณีหลาย IRR และข้อจำกัดของ Reinvestment assumption ส่วน MIRR ใช้ Reinvestment rate ที่สมเหตุผลกว่าและให้คำตอบเดียวภายใต้สมมติฐานที่กำหนด Microsoft ระบุว่า IRR/MIRR ใช้ Cash flow ที่เกิดเป็นงวดสม่ำเสมอและต้องมีทั้งค่าบวกกับค่าลบ หน้าเครื่องมือจึงแสดงสมมติฐานและคำเตือน ไม่แสดง IRR เดียวแบบเงียบ ๆ และไม่รับรองผลตอบแทน

- [Google Autocomplete — irr calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=irr%20calculator)
- [Google Autocomplete — mirr calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=mirr%20calculator)
- [Google Autocomplete — xirr calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=xirr%20calculator)
- [Google Autocomplete — คำนวณ irr](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%20irr)
- [OpenStax Principles of Finance 2e — Internal Rate of Return](https://openstax.org/books/principles-of-finance-2e/pages/16-3-internal-rate-of-return-irr-method)
- [OpenStax Principles of Finance 2e — Modified Internal Rate of Return](https://openstax.org/books/principles-of-finance-2e/pages/16-4-alternative-methods)
- [Microsoft Support — IRR function](https://support.microsoft.com/en-us/excel/functions/irr-function)
- [Microsoft Support — MIRR function](https://support.microsoft.com/en-us/excel/functions/mirr-function)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central — Spam policies and doorway abuse](https://developers.google.com/search/docs/essentials/spam-policies)

## รอบที่ 47 — XIRR, XNPV และผลตอบแทนจาก Cash flow ตามวันที่จริง (9 สิงหาคม 2569)

รอบนี้ส่งคำตั้งต้น 60 รูปแบบไปยัง Google Autocomplete ภาษาไทย/ประเทศไทย ครอบคลุม XIRR, XNPV, Actual dates, Irregular cash flow, Investment return, Money-weighted return, Portfolio, SIP, Mutual fund, Insurance, Real estate และคำไทย ได้คำแนะนำ 199 รายการไม่ซ้ำ สัญญาณตรงสูงสุดคือ `xirr calculator`, `xirr calculator excel`, `xirr example`, `xirr formula`, `xirr function`, `xirr online`, `xirr vs irr`, `xirr vs cagr`, `xnpv formula` และ `sip xirr calculator` ได้ 10/10; `xirr calculator online` 9/10; `mutual fund xirr calculator` และ `xirr calculator investment` 7/10; `money weighted return calculator` และ `xnpv vs npv` 6/10; `xnpv calculator` 1/10 ส่วน `xirr คือ` และ `สูตร xirr` 3/10 ตัวเลขทั้งหมดเป็น Autocomplete demand proxy ไม่ใช่ Search volume, Traffic forecast หรือหลักฐานว่าจะติดหน้าแรก Google

สัญญาณ SIP/Mutual fund มีบริบทอินเดียปนสูง จึงไม่ยัดสมมติฐานประเทศ กองทุน ภาษี หรือผลิตภัณฑ์เฉพาะเข้า Generic calculator ใช้ URL เดียว `xirr-calculator` รวม XIRR, XNPV at hurdle rate, Multiple/repeated/no-root diagnostics, XNPV profile, Actual-date timeline, Formula และ CSV เพราะใช้วันที่และ Cash flow ชุดเดียวกัน ไม่สร้างหน้า Free, Online, Excel, Formula, With dates หรือ XNPV แยกซ้ำเพื่อไล่ Keyword ส่วน SIP/Mutual fund, Insurance, Real estate และ Private equity แยกไว้จนกว่าจะมี Workflow และข้อจำกัดเฉพาะจริง

คะแนน 5 คือสูงที่สุด การจัดอันดับพิจารณา Demand ที่พบ, คุณค่าผู้ใช้จริง, ความต่างจาก 83 tools เดิม, ความโปร่งใสของสูตร, Revenue opportunity, Scalability, Innovation และความเสี่ยงจากการตีความข้อมูลผิด:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | XIRR & XNPV Date Calculator | XIRR 9–10/10; XNPV formula 10/10 | 5 | 5 | 5 | 5 | 5 | ส่งมอบ Batch 57; Actual dates, 365-day basis, All-root diagnostics, Profile, Timeline และ CSV |
| 2 | Dated Cash-flow Scenario Builder | Cash-flow/date related 1–6/10 | 5 | 5 | 5 | 5 | 5 | Base/Downside/Upside, Event timing, Sensitivity และ Export เข้า XIRR โดยไม่เรียก Scenario ว่า Forecast รับรอง |
| 3 | Investment Appraisal Comparison | XIRR/IRR/NPV related 6–10/10 | 5 | 5 | 5 | 5 | 5 | เทียบ NPV, XNPV, IRR, XIRR, MIRR, PI และ Payback บน Hurdle/Horizon ที่นิยามตรงกัน |
| 4 | Money-weighted vs Time-weighted Return | Money-weighted 5–6/10 | 5 | 5 | 5 | 5 | 5 | แยกผลจาก Cash-flow timing กับ Portfolio performance และต้องรองรับ Valuation sub-period อย่างโปร่งใส |
| 5 | Portfolio Cash-flow Return Import | XIRR investment 7/10 | 5 | 5 | 5 | 5 | 4 | Import Broker CSV ที่ Map schema เอง, แยก Deposit/Withdrawal/Trade/Fee และไม่อ้างผลก่อน Reconciliation |
| 6 | SIP / Recurring Investment Return | SIP XIRR 10/10 | 5 | 5 | 5 | 5 | 4 | Demand สูงแต่ต้องแยก Contribution date, NAV/current value, Country/tax และไม่ใช้คำรับรองกองทุน |
| 7 | Real-estate XIRR Underwriting | Real-estate seed 1/10 | 5 | 5 | 5 | 5 | 5 | Rent, Vacancy, Capex, Debt, Sale cost, Tax boundary และ Levered/Unlevered cash flow แยกชัด |
| 8 | Insurance Policy Return Analyzer | Insurance seed 1/10 ในรอบนี้; สูงในรอบ 46 | 5 | 5 | 5 | 4 | 4 | Premium, Benefit, Dividend, Surrender และ Coverage value ต้องไม่ถูกลดเหลือ XIRR ค่าเดียว |
| 9 | Project-finance Debt Waterfall | Related project intent | 5 | 5 | 5 | 5 | 5 | Sources/Uses, Drawdown, Interest, DSCR, Reserve, Sculpting และ Equity XIRR พร้อมข้อจำกัด Covenant |
| 10 | Private-equity MOIC & XIRR | Related investment intent | 5 | 4 | 5 | 4 | 5 | Interim cash flow, Fees, Recallable distribution, MOIC, DPI/RVPI/TVPI และ Preference waterfall |
| 11 | Irregular-loan APR / Effective Yield | XIRR formula related | 5 | 5 | 5 | 5 | 5 | ใช้ Dated disbursement/fee/payment และแยก Lender yield จาก Borrower APR ตามข้อกำกับประเทศ |
| 12 | Buy-vs-Lease Dated Model | Related irregular cash flow | 5 | 5 | 5 | 5 | 4 | After-tax incremental dated cash flow, Residual, Maintenance และ Financing timing ไม่ใช้ Payment ต่างอย่างเดียว |
| 13 | Irregular Bond Cash-flow Yield | Related XIRR formula | 5 | 4 | 4 | 4 | 5 | Coupon schedule, Accrued interest, Call/default scenario และ Day-count convention ต้องไม่บังคับ 365 ทุกกรณี |
| 14 | Solar Dated Project Model | Solar XIRR seedต่ำ | 5 | 5 | 5 | 5 | 4 | Construction draws, Generation, Degradation, Tariff, Export credit, Maintenance และ Location assumption |
| 15 | Donation / Endowment Cash-flow Analysis | Long-tail professional | 4 | 4 | 3 | 4 | 4 | Grant timing, Restricted funds, Spending rule และ Opportunity cost โดยไม่ตีความ XIRR เป็น Social impact |

Batch 57 ใช้ `XNPV(r) = Σ CF_i ÷ (1 + r)^((d_i − d_0) ÷ 365)` และหา `r > -100%` ที่ทำให้ XNPV เท่ากับศูนย์ แปลงเป็น `y = ln(1 + r)` เพื่อได้ผลรวมเอ็กซ์โพเนนเชียล `Σ CF_i exp(−t_i y)` แล้วใช้รากของอนุพันธ์แบ่งช่วง Monotonic ก่อน Bisection พร้อมตรวจ Critical point เพื่อจับรากซ้ำ วิธีนี้แสดงทุกรากที่ตรวจพบในช่วง -99.99% ถึง 100,000% ต่อปีแทนการพึ่ง Guess เดียว แต่ยังระบุสถานะนอกช่วงและไม่อ้างว่าตัวเลขสุดโต่งเหมาะต่อการตัดสินใจ

วันที่อ่านเป็น `YYYY-MM-DD` แบบ UTC เพื่อไม่ให้ Timezone ของอุปกรณ์เลื่อนวัน ต้องเรียงเก่าไปใหม่และไม่ซ้ำ นับวันปฏิทินจริงรวม Leap dayแต่หาร 365 ตาม XIRR/XNPV จำกัดช่วง 100 ปี, 61 Cash flows, Hurdle rate -99% ถึง 1,000% และจำนวนเงินต่อรายการ การคำนวณทั้งหมดทำใน Browser ไม่มี API หรือ LocalStorage ชื่อ Scenario/รายการใน CSV ถูกป้องกัน Spreadsheet Formula Injection และหน่วยเงินไม่มี FX conversion

Microsoft ระบุว่า XIRR ใช้ Cash flow ที่ไม่จำเป็นต้องเป็นงวดสม่ำเสมอ, อัตราสัมพันธ์กับ XNPV = 0 และ Guess ต่างกันอาจได้คำตอบต่างกันเมื่อมีหลายราก ส่วน XNPV ใช้วันที่จริงบนฐาน 365 วัน ตัวอย่างทางการ `-10000, 2750, 4250, 3250, 2750` ณ วันที่ `2008-01-01, 2008-03-01, 2008-10-30, 2009-02-15, 2009-04-01` ให้ XIRR ประมาณ 37.3362535% และ XNPV 2,086.65 ที่ 9% ชุดทดสอบของหน้าคำนวณยืนยันสองค่านี้ รวมหลายราก 10%/20%, รากซ้ำ 0%, ไม่มีราก, รากลบ, รากนอกช่วง, Leap day และ Formula-safe CSV

- [Google Autocomplete — xirr calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=xirr%20calculator)
- [Google Autocomplete — xirr formula](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=xirr%20formula)
- [Google Autocomplete — xnpv formula](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=xnpv%20formula)
- [Google Autocomplete — money weighted return calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=money%20weighted%20return%20calculator)
- [Google Autocomplete — สูตร xirr](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%AA%E0%B8%B9%E0%B8%95%E0%B8%A3%20xirr)
- [Microsoft Support — XIRR function](https://support.microsoft.com/en-us/excel/functions/xirr-function)
- [Microsoft Support — XNPV function](https://support.microsoft.com/en-us/excel/functions/xnpv-function)
- [Microsoft Support — Go with the cash flow](https://support.microsoft.com/en-us/office/go-with-the-cash-flow-calculate-npv-and-irr-in-excel-9e3d78bb-f1de-4f8e-a20e-b8955851690c)
- [Google Sheets — XNPV](https://support.google.com/docs/answer/3093268?hl=en)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central — Spam policies and doorway abuse](https://developers.google.com/search/docs/essentials/spam-policies)

## รอบที่ 48 — Compound Interest และ Savings Goal ข้ามสายงาน (9 สิงหาคม 2569)

รอบนี้เริ่มจากการสำรวจ Candidate ข้ามสายงาน เช่น เงินออม หนี้ บ้าน ราคา/ส่วนลด เวลา เอกสาร และธุรกิจ แล้วเจาะคำตั้งต้น 60 รูปแบบสำหรับ Compound interest, Savings goal, Future value, APY, Recurring investment และคำไทย ผ่าน Google Autocomplete ภาษาไทย/ประเทศไทย ได้คำแนะนำ 403 รายการไม่ซ้ำโดยไม่มี Request error จำนวนคำแนะนำเป็น Demand proxy ของความกว้าง Intent เท่านั้น ไม่ใช่ Search volume, Traffic forecast หรือหลักฐานว่าจะติดหน้าแรก Google

สัญญาณตรง `compound interest calculator` รวม Monthly, Daily, Contributions, Formula, Excel, Online, Free, Savings และ Investment ได้ 10/10; `savings goal calculator` 10/10; Savings calculator, Monthly savings, Future value, APY, DCA และ Recurring investment มีคำแนะนำต่อเนื่อง ส่วนคำไทย `คำนวณเงินออม`, `คำนวณดอกเบี้ยทบต้น`, `ดอกเบี้ยทบต้น สูตร` และ `คำนวณดอกเบี้ยเงินฝาก` ได้ 10/10; `คำนวณเงินลงทุน` 6/10 และ `โปรแกรมคำนวณเงินออม` 4/10

ใช้ URL เดียว `compound-interest-calculator` รวมสอง Workflow ที่ใช้สูตรและ Input ชุดเดียวกัน: คำนวณยอดเงินในอนาคต และย้อนหาเงินฝากต่องวดเพื่อถึงเป้าหมาย ไม่สร้างหน้า Monthly, Daily, Formula, Excel, Free, Online หรือ Savings แยกซ้ำเพื่อไล่ Keyword และไม่ดึงอัตราดอกเบี้ยปัจจุบันอัตโนมัติ เพราะอัตรา เงื่อนไข ภาษีและผลิตภัณฑ์เปลี่ยนได้

คะแนน 5 คือสูงที่สุด การจัดอันดับพิจารณา Demand ที่พบ, คุณค่าผู้ใช้จริง, ความต่างจาก 84 tools เดิม, Revenue opportunity, Technical complexity, Scalability, Innovation และความเสี่ยงจากการตีความผลผิด:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Compound Interest & Savings Goal Calculator | EN/TH ตรง 10/10 หลายแกน | 4 | 5 | 5 | 5 | 4 | ส่งมอบ Batch 58; Projection + Goal, APY, Timing, Inflation, Timeline และ CSV |
| 2 | Debt Snowball & Avalanche Planner | Debt payoff 10/10; ไทย 10/10 | 5 | 5 | 5 | 5 | 5 | ต้องมีหลายหนี้, Minimum payment, Extra payment, Rate change และเปรียบเทียบดอกเบี้ย/เวลาอย่างไม่ตัดสินผู้ใช้ |
| 3 | Date Duration & Countdown Calculator | Date duration 10/10 | 3 | 5 | 4 | 5 | 3 | รวมวัน/เดือน/ปี, Inclusive boundary, Working days option และ Timezone/date-only semantics ให้ชัด |
| 4 | Unit Price & Pack Comparison | Unit price 10/10 | 3 | 5 | 4 | 5 | 4 | รองรับหน่วย/ขนาด/โปรโมชันหลายแพ็กและ Total-cost view ไม่สรุปว่าของถูกกว่าคุ้มกว่าเสมอ |
| 5 | Bill Split & Shared Expense Calculator | Bill split 10/10; หารบิล 4/10 | 4 | 5 | 4 | 5 | 4 | แยกรายการตามคน, Service/VAT/Tip, Shared item, Rounding reconciliation และ Privacy-first share |
| 6 | Discount & Percentage Change Calculator | Discount 10/10; ไทย 3/10 | 3 | 5 | 4 | 5 | 3 | รวมลดหลายชั้น, Tax basis, Markup/Margin boundary และเปรียบเทียบราคาก่อน/หลังอย่างโปร่งใส |
| 7 | Time-zone Meeting Planner | Timezone 10/10 | 4 | 5 | 4 | 5 | 4 | ต้องใช้ IANA timezone, DST transition, Working hours overlap และ Shareable schedule ไม่ใช้ Offset คงที่แทน Zone |
| 8 | Purchase Order Generator | Purchase order 10/10 | 5 | 5 | 5 | 5 | 4 | PDF/CSV, Line items, Terms, Revision, Numbering และคำเตือนว่าไม่ใช่ระบบบัญชีหรือเอกสารรับรอง |
| 9 | Personal Budget Planner | Budget 10/10; เงินออม 10/10 | 5 | 5 | 5 | 5 | 4 | Cash-in/out, Categories, Irregular expenses, Goals และ local-only persistence/export โดยไม่อ้างคำแนะนำการเงิน |
| 10 | Mortgage Extra-payment Calculator | Mortgage 10/10; ผ่อนบ้าน 10/10 | 5 | 5 | 5 | 5 | 4 | ต้องมี Recast vs Term reduction, Rate reset, Fees และกติกาประเทศ ไม่ใช้ Generic loan แทนทุกสัญญา |
| 11 | Cash-flow Forecast Scenario | Cash flow 10/10 | 5 | 5 | 5 | 5 | 5 | Opening cash, AR/AP timing, Recurring items, Tax/VAT, Minimum cash และ Base/Downside/Upside พร้อม Audit trail |
| 12 | Emergency Fund Calculator | Savings related 10/10 | 4 | 5 | 4 | 5 | 4 | Essential expenses, Income volatility, Dependents และ Coverage months แบบผู้ใช้กำหนด ไม่ออกคำสั่งว่าต้องมีเท่าไร |
| 13 | APY / EAR Converter | APY 10/10 | 3 | 4 | 4 | 5 | 3 | แปลง Nominal/APY/Periodic rate, Compound frequency และ Fee-adjusted scenario โดยไม่ยัดเป็นหน้า Keyword บาง |
| 14 | Invoice Generator | Invoice 10/10; สร้างใบแจ้งหนี้ 3/10 | 5 | 5 | 5 | 5 | 4 | ต้องมี VAT/WHT boundary, Payment status, Numbering และชัดว่าไม่ใช่ใบกำกับภาษีโดยอัตโนมัติ |
| 15 | PDF Compressor ที่ลดขนาดจริง | PDF compressor 10/10 | 5 | 5 | 5 | 5 | 5 | ยังชะลอไว้จนวัด Size reduction/Quality/Compatibility ได้สม่ำเสมอ ไม่เปิดหน้าเปล่าตาม Demand |

Batch 58 ใช้ `APY = (1 + Nominal rate ÷ Compounds per year)^(Compounds per year) − 1` แล้วแปลงเป็นอัตราเทียบเท่าต่อรอบฝาก `r = (1 + APY)^(1 ÷ Deposits per year) − 1` มูลค่าเงินตั้งต้นคือ `P(1+r)^n` และเงินฝากปลายงวดใช้ `C((1+r)^n−1)÷r` ส่วนฝากต้นงวดคูณเพิ่ม `(1+r)` กรณีอัตราศูนย์ใช้ `n` โดยตรงเพื่อเลี่ยงการหารศูนย์

โหมดเป้าหมายหักมูลค่าอนาคตของเงินตั้งต้นออกจากเป้าหมายก่อนหารด้วย Annuity factor หากเลือกเป้าหมายเป็นกำลังซื้อวันนี้ ระบบเพิ่มเป้าหมายด้วย `(1+Inflation)^Years` และแสดงมูลค่าจริงด้วยการหารเงินปลายทางด้วยปัจจัยเดียวกัน แบบจำลองจำกัด 1–60 ปี อัตรา Nominal/เงินเฟ้อ -99% ถึง 100% และจำนวนเงิน พร้อมหยุดเมื่อผลลัพธ์เกินขอบเขตตัวเลข

Microsoft FV ระบุองค์ประกอบ Rate, Nper, Pmt, Pv และ Type ซึ่งแยกต้นงวด/ปลายงวด ตัวอย่างอัตรา 6%/12 ฝากต้นเดือน 100 มีเงินตั้งต้น 1,000 และ 12 งวดให้ 2,301.40 ชุดทดสอบของ Batch 58 ยืนยันค่านี้ รวม Zero rate, Goal solve, Inflation-adjusted goal, Negative rate, Starting balance reaches goal และ Formula-safe CSV ส่วน Investor.gov ใช้ Goal, Initial amount, Years, Estimated interest และ Compound frequency เป็นแกน Savings goal และธนาคารแห่งประเทศไทยอธิบาย Time value กับดอกเบี้ยทบต้น จึงแสดงสูตร สมมติฐาน และคำเตือนแทนการรับรองผล

## รอบที่ 49 — Debt Payoff, Snowball และ Avalanche (9 สิงหาคม 2569)

รอบนี้ส่งคำตั้งต้น 60 รูปแบบใน 3 กลุ่มไปยัง Google Autocomplete ภาษาไทย/ประเทศไทย โดยกลุ่ม Debt 25 คำได้คำแนะนำ 149 รายการไม่ซ้ำและคำตั้งต้นที่ได้ครบ 10/10 จำนวน 13 คำ กลุ่ม Unit price 20 คำได้ 90 รายการและเต็ม 10/10 จำนวน 6 คำ ส่วน Date duration 15 คำได้ 87 รายการและเต็ม 10/10 จำนวน 8 คำ ไม่มี Request error ทั้งสามกลุ่ม จำนวนคำแนะนำเป็น Demand proxy ของความกว้าง Intent เท่านั้น ไม่ใช่ Search volume, Traffic forecast, Conversion หรือหลักฐานว่าจะติดหน้าแรก Google

สัญญาณตรงของกลุ่ม Debt ได้แก่ `debt payoff calculator`, `debt snowball calculator`, `debt avalanche calculator`, `debt reduction calculator`, `debt repayment calculator`, `debt payoff planner`, `credit card debt payoff calculator` และ `debt snowball vs avalanche` ที่ได้ 10/10 พร้อมคำไทย `คำนวณหนี้` 10/10; Excel 9/10, Extra payment 5/10, Multiple debt 4/10 และ `วางแผนปลดหนี้` 1/10 กลุ่ม Unit price มีแกน English หลายคำ 10/10 แต่คำไทย `คำนวณราคาต่อหน่วย` ได้ 1/10 ส่วน Date duration มี Demand สูงแต่ซ้ำ Workflow ของ `date-calculator` และ `business-days-calculator` จึงไม่สร้าง URL ใหม่ให้เกิด Keyword cannibalization

ใช้ URL เดียว `debt-payoff-calculator` รวม Debt payoff, Snowball, Avalanche, Extra payment, Multiple debts, Credit card, Excel intent และ Debt-free date เพราะใช้ Input และแบบจำลองเดียวกัน ไม่สร้างหน้า Free, Online, Excel, Snowball หรือ Avalanche แยกซ้ำเพื่อไล่ Keyword ส่วน Credit-card statement simulator, Balance transfer, Debt consolidation, DTI และ Mortgage extra payment แยกไว้ เพราะมี Minimum formula, Fee, New APR, Income basis หรือ Secured-loan rules คนละ Workflow

คะแนน 5 คือสูงที่สุด การจัดอันดับพิจารณา Demand ที่พบ, คุณค่าผู้ใช้จริง, ความต่างจาก 85 tools เดิม, Revenue opportunity, Technical complexity, Scalability, Innovation และความเสี่ยงจากการใช้ผลทางการเงินผิดบริบท:

| อันดับ | แนวคิด | Demand ที่พบ | ยาก | คุณค่าธุรกิจ | รายได้ | ขยายต่อ | นวัตกรรม | ข้อสรุป |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Debt Snowball & Avalanche Calculator | Debt core EN/TH 10/10 หลายแกน | 5 | 5 | 5 | 5 | 5 | ส่งมอบ Batch 59; Multi-debt, Fixed budget rollover, Compare, Timeline และ CSV |
| 2 | Credit Card Payoff Planner | Credit card 10/10 | 5 | 5 | 5 | 5 | 4 | ต้องเพิ่ม Minimum แบบเปอร์เซ็นต์/ขั้นต่ำคงที่, Statement cycle, Fee และ Promo APR |
| 3 | Debt Consolidation Comparison | Consolidation related intent | 5 | 5 | 5 | 5 | 5 | ต้องเทียบ Origination fee, New APR/term, Old payoff, Cash-flow relief และ Total cost |
| 4 | Extra Payment Loan Planner | Extra payment 5/10 | 4 | 5 | 5 | 5 | 4 | ใช้ Loan amortization รายสัญญาและ Prepayment rule ต่างจาก Multi-debt priority |
| 5 | Emergency Fund vs Debt Scenario | Related planning intent | 5 | 5 | 4 | 5 | 5 | ต้องแยก Liquidity floor, Risk scenario และห้ามสรุปทางเลือกแทนผู้ใช้ |
| 6 | Debt-to-Income Calculator | DTI related intent | 4 | 5 | 5 | 5 | 4 | ต้องระบุ Gross/Net income และไม่อ้างเกณฑ์ผู้ให้กู้แบบคงที่โดยไม่ version |
| 7 | Balance Transfer Calculator | Credit card transfer intent | 5 | 5 | 5 | 4 | 5 | ต้องมี Transfer fee, Intro period, Revert APR และ New purchase allocation |
| 8 | Student Loan Repayment Planner | Country-specific intent | 5 | 5 | 4 | 3 | 4 | กฎตามประเทศและแผนชำระเปลี่ยนได้ ต้องใช้แหล่งทางการและ version rules |
| 9 | Mortgage Extra Payment Calculator | Mortgage intent สูง | 5 | 5 | 5 | 5 | 4 | ต้องรองรับ Amortization, Lump sum, Recast, Prepayment penalty และ Escrow boundary |
| 10 | Debt-free Date Tracker | Debt-free date 1/10 | 3 | 4 | 4 | 5 | 4 | วันที่ประมาณรวม Batch 59 แล้ว งาน Tracker แยกต้องมี Persistence และ Actual-payment reconciliation |
| 11 | Debt Settlement Offer Comparison | Settlement intent | 5 | 4 | 5 | 4 | 3 | ความเสี่ยงสูง ต้องรวม Tax/legal/credit impact และไม่ส่งเสริมบริการเรียกค่าล่วงหน้า |
| 12 | Credit Utilization Planner | Credit utilization intent | 4 | 4 | 5 | 5 | 4 | ต้องมี Statement balance, Reporting date, Limit และไม่รับรองผล Credit score |
| 13 | Budget-to-Debt Payment Capacity | Budget/debt related | 5 | 5 | 4 | 5 | 5 | ต้องแยก Essential expense, Irregular cost, Buffer และ Negative-cash-flow state |
| 14 | Medical Debt Payment Plan | Medical debt related | 5 | 4 | 4 | 3 | 4 | ต้องระวังประเทศ/สิทธิ/กฎหมายและแยก Interest-free provider plan จาก credit debt |
| 15 | BNPL Installment Tracker | BNPL related intent | 4 | 4 | 4 | 5 | 4 | ต้องมี Due date, Late fee, Multiple provider และ Privacy-safe local persistence |

Batch 59 คงงบรายเดือนไว้ที่ `Σ ยอดขั้นต่ำเดิม + เงินโปะ` ทุกเดือน คิดดอกเบี้ยแต่ละก้อนเป็น `ยอดต้นเดือน × APR ÷ 12` แล้วจ่ายขั้นต่ำทุกก้อนก่อน ส่วนที่เหลือไปตามลำดับ Avalanche คือ APR สูงสุดก่อนโดยใช้ยอดคงเหลือน้อยกว่าเป็นตัวตัดสินเมื่อดอกเท่ากัน; Snowball คือยอดคงเหลือน้อยสุดก่อนโดยใช้ APR สูงกว่าเป็นตัวตัดสินเมื่อยอดเท่ากัน เงินที่เกินยอดปิดก้อนจะไหลไปก้อนถัดไปในเดือนเดียวกันและแบบจำลองหยุดอย่างโปร่งใสที่ 600 เดือนหากยังไม่หมด

CFPB อธิบายสองวิธีและระบุว่าวิธีอัตราสูงก่อนอาจประหยัดเงินระยะยาว ขณะที่ Snowball เริ่มจากยอดเล็กและโยกเงินไปก้อนถัดไปแต่อาจมีต้นทุนรวมสูงกว่า Debt action plan ของ CFPB ย้ำให้จ่ายขั้นต่ำทุกก้อนก่อนโยกเงินส่วนเพิ่ม Consumer.gov แนะนำให้เริ่มจากงบประมาณและติดต่อบริษัทเมื่อชำระลำบาก ส่วน FTC เตือนบริการที่เก็บค่าธรรมเนียมล่วงหน้าหรือรับประกันผล เครื่องมือจึงไม่ทำหน้าที่ Debt settlement, Credit counseling หรือเจรจาเจ้าหนี้ และแสดงข้อจำกัดของ APR คงที่ ดอกเบี้ยรายเดือน ค่าธรรมเนียม อัตราผันแปร โปรโมชั่น การผิดนัด และกฎปัดเศษอย่างชัดเจน

- [Google Autocomplete — debt payoff calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=debt%20payoff%20calculator)
- [Google Autocomplete — debt snowball calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=debt%20snowball%20calculator)
- [Google Autocomplete — debt avalanche calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=debt%20avalanche%20calculator)
- [Google Autocomplete — คำนวณหนี้](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B8%AB%E0%B8%99%E0%B8%B5%E0%B9%89)
- [CFPB — How to reduce your debt](https://www.consumerfinance.gov/archive/blog/how-reduce-your-debt/)
- [CFPB — Your Money, Your Goals: Debt action plan](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_debt-action-plan_tool_2018-11.pdf)
- [Consumer.gov — Debt Explained](https://consumer.gov/debt/debt-explained)
- [FTC — Looking for debt relief? Avoid a scam](https://consumer.ftc.gov/consumer-alerts/2026/03/looking-debt-relief-heres-how-avoid-scam)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central Blog — Doorway pages](https://developers.google.com/search/blog/2015/03/an-update-on-doorway-pages)

- [Google Autocomplete — compound interest calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=compound%20interest%20calculator)
- [Google Autocomplete — savings goal calculator](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=savings%20goal%20calculator)
- [Google Autocomplete — คำนวณเงินออม](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B9%80%E0%B8%87%E0%B8%B4%E0%B8%99%E0%B8%AD%E0%B8%AD%E0%B8%A1)
- [Google Autocomplete — คำนวณดอกเบี้ยทบต้น](https://suggestqueries.google.com/complete/search?client=firefox&hl=th&gl=th&q=%E0%B8%84%E0%B8%B3%E0%B8%99%E0%B8%A7%E0%B8%93%E0%B8%94%E0%B8%AD%E0%B8%81%E0%B9%80%E0%B8%9A%E0%B8%B5%E0%B9%89%E0%B8%A2%E0%B8%97%E0%B8%9A%E0%B8%95%E0%B9%89%E0%B8%99)
- [Investor.gov — Savings Goal Calculator](https://www.investor.gov/financial-tools-calculators/calculators/savings-goal-calculator)
- [Microsoft Support — FV function](https://support.microsoft.com/en-us/office/fv-function-2eef9f44-a084-4c61-bdd8-4fe4bb1b71b3)
- [Bank of Thailand — เครื่องมือคำนวณการออม](https://www.bot.or.th/th/satang-story/financial-tools/savings-tools.html)
- [Bank of Thailand — ดอกเบี้ยเงินฝากและดอกเบี้ยทบต้น](https://www.bot.or.th/th/satang-story/rights-responsibility/deposit-interest.html)
- [Google Search Central — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central — How Search works and no indexing guarantee](https://developers.google.com/search/docs/fundamentals/how-search-works)
