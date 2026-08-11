export type ProfessionConfig = {
  value: string;
  label: string;
  englishLabel: string;
  description: string;
  shortDescription: string;
  icon: string;
  keywords: string[];
  highlights: string[];
  toolSlugs: string[];
};

export const professionConfigs: ProfessionConfig[] = [
  {
    value: "developer-it",
    label: "นักพัฒนาและ IT",
    englishLabel: "Developer & IT",
    description: "รวมเครื่องมือออนไลน์สำหรับโปรแกรมเมอร์ นักพัฒนาเว็บ DevOps ผู้ดูแลระบบ และทีม IT ช่วยตรวจข้อมูล แปลงค่า ทดสอบรูปแบบ และลดงานซ้ำระหว่างพัฒนาโดยไม่ต้องส่งโค้ดขึ้น Server",
    shortDescription: "จัดการ JSON, SQL, JWT, Regex, UUID และงานพัฒนาประจำวัน",
    icon: "Code2",
    keywords: ["เครื่องมือโปรแกรมเมอร์", "developer tools online", "เครื่องมือ it ฟรี"],
    highlights: ["ตรวจและจัดรูปแบบข้อมูล", "เข้ารหัสและแปลงค่า", "ช่วยทดสอบและ Debug"],
    toolSlugs: ["json-formatter", "json-validator", "sql-formatter", "jwt-decoder", "uuid-generator", "timestamp-converter", "time-zone-meeting-planner", "time-blocking-planner", "habit-tracker", "online-notepad", "todo-list-online", "pomodoro-timer", "online-stopwatch", "base64", "url-encoder", "regex-tester", "diff-checker", "cron-generator", "hash-generator", "markdown-table-generator", "html-table-generator", "color-picker", "password-generator"],
  },
  {
    value: "digital-marketing",
    label: "การตลาดดิจิทัล",
    englishLabel: "Digital Marketing",
    description: "เครื่องมือฟรีสำหรับ Digital Marketer, Performance Marketing, SEO, Social Media และ E-commerce ตั้งแต่สร้าง UTM เตรียมคอนเทนต์ ไปจนถึงวิเคราะห์ราคา กำไร และประสิทธิภาพค่าโฆษณา",
    shortDescription: "วางแคมเปญ สร้างคอนเทนต์ และวัดผลการตลาดออนไลน์",
    icon: "Sparkles",
    keywords: ["เครื่องมือ digital marketing", "marketing tools free", "เครื่องมือการตลาดออนไลน์"],
    highlights: ["ติดตามแคมเปญ", "เตรียมคอนเทนต์และภาพ", "วิเคราะห์ราคาและกำไร"],
    toolSlugs: ["utm-builder", "time-zone-meeting-planner", "time-blocking-planner", "habit-tracker", "online-notepad", "todo-list-online", "pomodoro-timer", "countdown-timer", "online-stopwatch", "email-signature-generator", "word-counter", "word-cloud-generator", "special-characters", "qr-code-generator", "qr-code-scanner", "barcode-generator", "color-picker", "percentage-calculator", "image-compressor", "background-remover", "favicon-generator", "profit-margin-calculator", "roas-calculator", "random-wheel"],
  },
  {
    value: "business-owner",
    label: "เจ้าของธุรกิจและ SME",
    englishLabel: "Business Owner & SME",
    description: "รวมเครื่องมือบริหารธุรกิจสำหรับเจ้าของกิจการและ SME ช่วยวางงบ ออกใบเสนอราคา คำนวณ VAT ต้นทุน กำไร จุดคุ้มทุน สต็อก และค่าจ้าง เพื่อเห็นตัวเลขสำคัญก่อนตัดสินใจ",
    shortDescription: "คุมงบ ต้นทุน ราคา กำไร ภาษี และกระแสงานของธุรกิจ",
    icon: "BriefcaseBusiness",
    keywords: ["เครื่องมือ sme", "เครื่องมือเจ้าของธุรกิจ", "business calculator free"],
    highlights: ["ตั้งราคาและดูจุดคุ้มทุน", "บริหารงบและต้นทุน", "จัดการเอกสารการขาย"],
    toolSlugs: ["expense-tracker", "todo-list-online", "budget-calculator", "bill-split-calculator", "vat-calculator", "quotation-generator", "invoice-generator", "email-signature-generator", "time-zone-meeting-planner", "time-blocking-planner", "profit-margin-calculator", "roas-calculator", "break-even-calculator", "wholesale-price-calculator", "unit-price-comparison-calculator", "inventory-turnover-calculator", "cost-of-goods-sold-calculator", "salary-calculator", "fuel-cost-calculator", "loan-calculator"],
  },
  {
    value: "finance-accounting",
    label: "การเงินและบัญชี",
    englishLabel: "Finance & Accounting",
    description: "เครื่องมือคำนวณสำหรับนักบัญชี ฝ่ายการเงิน และผู้วางแผนงบประมาณ ครอบคลุม VAT ภาษีเงินได้ เงินเดือน ต้นทุนโครงการ ผลตอบแทนการลงทุน ดอกเบี้ย และแผนชำระหนี้",
    shortDescription: "คำนวณภาษี งบ ต้นทุน เงินเดือน และผลตอบแทนทางการเงิน",
    icon: "ReceiptText",
    keywords: ["เครื่องมือบัญชีออนไลน์", "เครื่องมือการเงินฟรี", "finance calculator tools"],
    highlights: ["ภาษีและเงินเดือน", "งบประมาณและต้นทุน", "วิเคราะห์การลงทุน"],
    toolSlugs: ["expense-tracker", "budget-calculator", "percentage-calculator", "vat-calculator", "quotation-generator", "invoice-generator", "salary-calculator", "thai-income-tax-calculator", "cost-of-goods-sold-calculator", "inventory-turnover-calculator", "project-cost-calculator", "irr-calculator", "xirr-calculator", "payback-period-calculator", "compound-interest-calculator", "debt-payoff-calculator", "loan-calculator"],
  },
  {
    value: "human-resources",
    label: "HR และ Payroll",
    englishLabel: "Human Resources & Payroll",
    description: "รวมเครื่องมือสำหรับ HR, Payroll และหัวหน้าทีม ช่วยคำนวณเงินเดือน OT ประกันสังคม ต้นทุนแรงงาน ตารางกะ ชั่วโมงทำงาน คอมมิชชัน และกำลังคนของทีม",
    shortDescription: "ดูเงินเดือน OT กะงาน ต้นทุนแรงงาน และกำลังคน",
    icon: "UsersRound",
    keywords: ["เครื่องมือ hr", "โปรแกรมคำนวณ payroll", "เครื่องมือฝ่ายบุคคล"],
    highlights: ["เงินเดือนและสวัสดิการ", "เวลาและตารางกะ", "ต้นทุนและ Capacity ทีม"],
    toolSlugs: ["salary-calculator", "overtime-calculator-thailand", "social-security-pension-calculator", "working-hours-calculator", "shift-pattern-calculator", "labor-cost-calculator", "sales-commission-calculator", "team-capacity-calculator", "age-calculator", "thai-id-validator"],
  },
  {
    value: "project-operations",
    label: "Project และ Operations",
    englishLabel: "Project & Operations",
    description: "เครื่องมือสำหรับ Project Manager, Operations, Procurement และหัวหน้าทีม ช่วยวางวันทำงาน ชั่วโมง ต้นทุนประชุม งบโครงการ Capacity แรงงาน และระดับสินค้าคงคลัง",
    shortDescription: "วางเวลา ต้นทุน Capacity และระบบปฏิบัติการให้เป็นตัวเลข",
    icon: "CalendarCheck2",
    keywords: ["เครื่องมือ project manager", "operations tools free", "เครื่องมือบริหารโครงการ"],
    highlights: ["วางแผนเวลาโครงการ", "คุมต้นทุนและกำลังคน", "บริหารสต็อกและการสั่งซื้อ"],
    toolSlugs: ["time-zone-meeting-planner", "time-blocking-planner", "habit-tracker", "online-notepad", "todo-list-online", "pomodoro-timer", "countdown-timer", "online-stopwatch", "business-days-calculator", "working-hours-calculator", "meeting-cost-calculator", "billable-hours-calculator", "project-cost-calculator", "team-capacity-calculator", "labor-cost-calculator", "safety-stock-calculator", "eoq-calculator", "inventory-turnover-calculator", "break-even-calculator"],
  },
  {
    value: "content-creator",
    label: "Content Creator และนักเขียน",
    englishLabel: "Content Creator & Writer",
    description: "รวมเครื่องมือสำหรับ Content Creator, Copywriter, นักเขียน และทีมสื่อ ช่วยนับคำ ทำความสะอาดข้อความ สร้าง Word Cloud แปลงข้อความเป็นเสียง ดึงข้อความจากภาพ และเตรียมตารางสำหรับเผยแพร่",
    shortDescription: "เขียน ตรวจ ทำความสะอาด และแปลงคอนเทนต์ได้เร็วขึ้น",
    icon: "FilePenLine",
    keywords: ["เครื่องมือ content creator", "เครื่องมือนักเขียน", "content tools free"],
    highlights: ["ตรวจและจัดข้อความ", "สร้างสื่อจากเนื้อหา", "เตรียมข้อมูลเพื่อเผยแพร่"],
    toolSlugs: ["time-blocking-planner", "habit-tracker", "online-notepad", "todo-list-online", "pomodoro-timer", "countdown-timer", "online-stopwatch", "word-counter", "word-cloud-generator", "text-cleaner", "typing-test", "special-characters", "text-to-speech", "resume-builder", "email-signature-generator", "diff-checker", "image-to-text", "markdown-table-generator", "html-table-generator"],
  },
  {
    value: "education",
    label: "ครู นักเรียน และนักศึกษา",
    englishLabel: "Education & Student",
    description: "เครื่องมือการเรียนและการสอนสำหรับครู นักเรียน นักศึกษา และผู้ปกครอง ช่วยคำนวณเกรด เปอร์เซ็นต์ อายุ แปลงหน่วย นับคำ ฝึกพิมพ์ สร้าง QR และเตรียมเอกสารเรียน",
    shortDescription: "ช่วยคำนวณ ทำรายงาน เตรียมสื่อ และจัดเอกสารการเรียน",
    icon: "GraduationCap",
    keywords: ["เครื่องมือการเรียนออนไลน์", "เครื่องมือสำหรับครู", "student tools free"],
    highlights: ["คำนวณเกรดและตัวเลข", "ทำรายงานและสื่อการสอน", "แปลงเอกสารและข้อมูล"],
    toolSlugs: ["time-blocking-planner", "habit-tracker", "online-notepad", "todo-list-online", "pomodoro-timer", "interval-timer", "countdown-timer", "online-stopwatch", "grade-calculator", "age-calculator", "percentage-calculator", "unit-converter", "buddhist-year-converter", "timestamp-converter", "bmi-calculator", "typing-test", "word-counter", "qr-code-generator", "text-to-speech", "jpg-to-pdf", "random-number-generator", "random-wheel"],
  },
  {
    value: "fitness-wellness",
    label: "ฟิตเนส โค้ช และสุขภาพทั่วไป",
    englishLabel: "Fitness, Coach & Wellness",
    description: "รวมเครื่องมือออนไลน์สำหรับ Personal Trainer โค้ชกีฬา ครูพละ ผู้จัดคลาส ผู้ฝึกออกกำลังกาย และผู้ดูแลสุขภาพทั่วไป ช่วยจับ Interval, Tabata, HIIT และรอบกีฬา ติดตามกิจวัตร รวมถึงคำนวณค่าพื้นฐานเพื่อเตรียมกิจกรรมอย่างเป็นระบบ",
    shortDescription: "จับเวลาฝึกเป็นรอบ วางกิจวัตร และคำนวณข้อมูลพื้นฐานสำหรับกิจกรรม",
    icon: "Activity",
    keywords: ["เครื่องมือฟิตเนสออนไลน์", "เครื่องมือ personal trainer", "fitness coach tools free", "จับเวลาออกกำลังกาย"],
    highlights: ["จับ Interval และรอบกีฬา", "วางกิจวัตรการฝึก", "คำนวณข้อมูลพื้นฐาน"],
    toolSlugs: ["interval-timer", "online-stopwatch", "countdown-timer", "habit-tracker", "todo-list-online", "bmi-calculator", "age-calculator", "percentage-calculator", "unit-converter", "random-number-generator", "random-wheel", "text-to-speech"],
  },
  {
    value: "designer-media",
    label: "นักออกแบบและงานสื่อ",
    englishLabel: "Design & Media",
    description: "รวมเครื่องมือสำหรับ Graphic Designer, UI Designer, ช่างภาพ และทีมสื่อ ช่วยเลือกสี ครอป บีบอัด แปลงไฟล์ ลบพื้นหลัง สร้าง Favicon และจัดการรูปภาพหรือ PDF ใน Browser",
    shortDescription: "จัดการสี รูปภาพ ไฟล์สื่อ และ PDF โดยไม่ต้องติดตั้งโปรแกรม",
    icon: "Palette",
    keywords: ["เครื่องมือนักออกแบบ", "เครื่องมือแต่งรูปออนไลน์", "design tools free"],
    highlights: ["เตรียมและปรับรูปภาพ", "จัดชุดสีและแบรนด์", "แปลงและจัดหน้าเอกสาร"],
    toolSlugs: ["color-picker", "image-cropper", "image-compressor", "jpg-to-png", "png-to-jpg", "heic-to-jpg", "background-remover", "favicon-generator", "jpg-to-pdf", "pdf-to-jpg", "pdf-organizer", "sign-pdf", "qr-code-generator", "barcode-generator"],
  },
  {
    value: "office-admin",
    label: "ธุรการและงานสำนักงาน",
    englishLabel: "Office & Administration",
    description: "เครื่องมือสำนักงานสำหรับ Admin, Coordinator และผู้ช่วยงานเอกสาร ช่วยจัด CSV และ Excel ทำใบเสนอราคา รวม/แยก/เซ็น PDF ดึงข้อความจากภาพ คำนวณวัน และตรวจเอกสารก่อนส่ง",
    shortDescription: "จัดข้อมูล เอกสาร PDF ตาราง และงานประสานงานประจำวัน",
    icon: "FileSpreadsheet",
    keywords: ["เครื่องมือสำนักงานออนไลน์", "เครื่องมือธุรการ", "office tools free"],
    highlights: ["จัดตารางและข้อมูล", "เตรียมเอกสารธุรกิจ", "จัดการ PDF ครบงาน"],
    toolSlugs: ["csv-to-excel", "excel-to-csv", "csv-cleaner", "resume-builder", "email-signature-generator", "time-zone-meeting-planner", "time-blocking-planner", "habit-tracker", "online-notepad", "todo-list-online", "pomodoro-timer", "online-stopwatch", "quotation-generator", "invoice-generator", "merge-pdf", "split-pdf", "pdf-organizer", "sign-pdf", "image-to-text", "text-cleaner", "word-counter", "working-hours-calculator", "date-calculator", "thai-id-validator", "qr-code-scanner"],
  },
  {
    value: "freelancer-consultant",
    label: "ฟรีแลนซ์และที่ปรึกษา",
    englishLabel: "Freelancer & Consultant",
    description: "รวมเครื่องมือสำหรับฟรีแลนซ์ ที่ปรึกษา Agency และผู้รับงานอิสระ ช่วยตั้งเรตรายชั่วโมง ประเมินเวลาที่เก็บเงินได้ คุมต้นทุนโครงการ ทำใบเสนอราคา วางภาษี และติดตามเป้ารายได้",
    shortDescription: "ตั้งเรต เสนอราคา คุมเวลา ต้นทุน ภาษี และกำไรของงาน",
    icon: "BadgeDollarSign",
    keywords: ["เครื่องมือฟรีแลนซ์", "คำนวณเรทฟรีแลนซ์", "freelancer tools free"],
    highlights: ["ตั้งราคาและเรตรับงาน", "คุมชั่วโมงและต้นทุน", "วางแผนรายได้และภาษี"],
    toolSlugs: ["expense-tracker", "todo-list-online", "hourly-rate-calculator", "billable-hours-calculator", "project-cost-calculator", "quotation-generator", "invoice-generator", "email-signature-generator", "time-zone-meeting-planner", "time-blocking-planner", "habit-tracker", "online-notepad", "pomodoro-timer", "online-stopwatch", "thai-income-tax-calculator", "profit-margin-calculator", "meeting-cost-calculator", "resume-builder", "budget-calculator", "debt-payoff-calculator", "business-days-calculator"],
  },
  {
    value: "food-beverage",
    label: "ร้านอาหาร คาเฟ่ และ F&B",
    englishLabel: "Food, Beverage & Cafe",
    description: "เครื่องมือสำหรับเจ้าของร้านอาหาร คาเฟ่ บาร์ โรงคั่ว และทีม F&B ช่วยคำนวณ Food Cost, Drink Cost, ต้นทุนกาแฟ ราคาขายส่ง จุดคุ้มทุน สต็อก และภาษีมูลค่าเพิ่ม",
    shortDescription: "คุมสูตร ต้นทุน ราคา กำไร สต็อก และจุดคุ้มทุนของร้าน",
    icon: "ChefHat",
    keywords: ["เครื่องมือร้านอาหาร", "โปรแกรมคำนวณ food cost", "เครื่องมือเจ้าของร้านกาแฟ"],
    highlights: ["คุมต้นทุนต่อเมนู", "ตั้งราคาและกำไร", "วางแผนสต็อกวัตถุดิบ"],
    toolSlugs: ["expense-tracker", "food-cost-calculator", "drink-cost-calculator", "coffee-cost-calculator", "coffee-roasting-calculator", "wholesale-price-calculator", "inventory-turnover-calculator", "cost-of-goods-sold-calculator", "break-even-calculator", "eoq-calculator", "safety-stock-calculator", "unit-price-comparison-calculator", "vat-calculator"],
  },
];

export const professionMap = new Map(professionConfigs.map((profession) => [profession.value, profession]));

export function getProfession(value: string): ProfessionConfig | undefined {
  return professionMap.get(value);
}

export function getProfessionsForTool(slug: string): ProfessionConfig[] {
  return professionConfigs.filter((profession) => profession.toolSlugs.includes(slug));
}
