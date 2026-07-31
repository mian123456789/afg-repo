import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BadgeDollarSign,
  Banknote,
  Bell,
  Boxes,
  CalendarCheck,
  ChartColumn,
  ChevronDown,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Menu,
  Minus,
  PackagePlus,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react'
import './App.css'

type Page =
  | 'Dashboard'
  | 'POS Billing'
  | 'DTG Billing'
  | 'Sales'
  | 'Customers'
  | 'Inventory'
  | 'Expenses'
  | 'Staff'
  | 'Salary'
  | 'Attendance'
  | 'Reports'
  | 'Users'
  | 'Settings'

type PaymentMethod = 'Cash' | 'Bank'
type PaymentStatus = 'Paid' | 'Pending'
type Role = 'Owner' | 'Admin'
type ManagedRole = Exclude<Role, 'Owner'>

type UserAccount = {
  id: string
  name: string
  username: string
  password: string
  role: Role
  status: 'Active' | 'Inactive'
  created: string
}

type LoginAttempt = {
  attempts: number
  lockedUntil: number
}

const permissionOptions: Page[] = ['Dashboard', 'POS Billing', 'DTG Billing', 'Sales', 'Customers', 'Inventory', 'Expenses', 'Staff', 'Salary', 'Attendance', 'Reports', 'Users', 'Settings']

type Product = {
  id: string
  description: string
  image?: string
  article: string
  barcode: string
  category: string
  unit: string
  cost: number
  rate: number
  stock: number
  minStock: number
  status: 'Active' | 'Inactive'
  created: string
}

type Customer = {
  name: string
  phone: string
  address: string
  totalPurchases: number
  totalPaid: number
  lastPurchase: string
}

type Expense = {
  id: string
  date: string
  description: string
  amount: number
  paymentMethod: PaymentMethod
  addedBy: string
  notes: string
}

type AttendanceStatus = 'Present' | 'Late' | 'Half Day' | 'Absent'
type SalaryMode = 'Monthly' | 'Theka'

type StaffMember = {
  id: string
  name: string
  phone: string
  department: string
  designation: string
  shiftStart: string
  shiftEnd: string
  salaryAmount: number
  salaryEnabled: boolean
  salaryMode?: SalaryMode
  status: 'Active' | 'Inactive'
}

type AttendanceRecord = {
  id: string
  staffId: string
  date: string
  employee: string
  department: string
  checkIn: string
  checkOut: string
  status: AttendanceStatus
}

type PieceRateEntry = {
  id: string
  date: string
  endDate?: string
  staffId: string
  employee: string
  department: string
  item: string
  pcs: number
  rate: number
  total: number
  addedBy: string
}

type SalaryAdvance = {
  id: string
  date: string
  staffId: string
  employee: string
  salaryType: SalaryMode
  amount: number
  remarks: string
  addedBy: string
}

type CartItem = {
  productId: string
  description: string
  article: string
  image?: string
  position?: string
  width?: number
  height?: number
  qty: number
  rate: number
}

type Sale = {
  invoice: string
  date: string
  time: string
  customer: string
  phone: string
  vehicleNumber?: string
  items: CartItem[]
  subtotal: number
  pretreatmentCharge?: number
  discount: number
  total: number
  received: number
  remaining: number
  change: number
  method: PaymentMethod
  paymentStatus: PaymentStatus
  cashier: string
  bankName?: string
  reference?: string
  remarks?: string
}

type AppNotification = {
  id: string
  title: string
  detail: string
  icon: LucideIcon
  tone: 'warning' | 'success' | 'danger'
  recipientRole?: Role
}

type CompanySettings = {
  logo: string
  companyName: string
  businessName: string
  address: string
  phone: string
  whatsapp: string
  email: string
  website: string
  ntn: string
  strn: string
  currency: string
  footerMessage: string
  thankYou: string
  invoicePrefix: string
  startingNumber: number
  defaultPrintSize: 'A4' | '80mm Thermal'
  showLogo: boolean
  showSignature: boolean
  lowStockLimit: number
}

const today = new Date()
const getTodayText = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const dateText = getTodayText()
const timeText = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const ownerUsername = 'AFG'
const ownerPassword = 'AFG 2000'

const initialUsers: UserAccount[] = [
  {
    id: 'USR-OWNER',
    name: 'Owner User',
    username: ownerUsername,
    password: ownerPassword,
    role: 'Owner',
    status: 'Active',
    created: dateText,
  },
]

const defaultRolePermissions: Record<ManagedRole, Page[]> = {
  Admin: [...permissionOptions],
}

const loadUserAccounts = (): UserAccount[] => {
  try {
    const saved = window.localStorage.getItem('afg-user-accounts')
    const parsed = saved ? JSON.parse(saved) as Array<UserAccount & { email?: string; phone?: string }> : null
    if (Array.isArray(parsed) && parsed.some((account) => account.role === 'Owner')) {
      return parsed.map(({ email: _removedEmail, phone: _removedPhone, ...account }) => (
        account.role === 'Owner'
          ? { ...account, username: ownerUsername, password: ownerPassword, status: 'Active' }
          : { ...account, role: 'Admin' }
      ))
    }
  } catch {
    // Fall back to the protected initial Owner account.
  }
  return initialUsers
}

const loadRolePermissions = (): Record<ManagedRole, Page[]> => {
  try {
    const saved = window.localStorage.getItem('afg-role-permissions')
    const parsed = saved ? JSON.parse(saved) as Partial<Record<ManagedRole, string[]>> : null
    if (parsed?.Admin) {
      const migratedPages = parsed.Admin.map((page) => page === 'DTF Billing' ? 'DTG Billing' : page)
      const savedPages = migratedPages.filter((page): page is Page => permissionOptions.includes(page as Page))
      const hadLegacyFullAccess = permissionOptions
        .filter((page) => page !== 'Customers')
        .every((page) => savedPages.includes(page))
      return {
        Admin: hadLegacyFullAccess && !savedPages.includes('Customers')
          ? [...savedPages, 'Customers']
          : savedPages,
      }
    }
  } catch {
    // Use the default role access when saved permissions are unavailable.
  }
  return defaultRolePermissions
}

const loadLoginAttempts = (): Record<string, LoginAttempt> => {
  try {
    const saved = window.localStorage.getItem('afg-login-attempts')
    const parsed = saved ? JSON.parse(saved) as Record<string, LoginAttempt> : null
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

type AppSession = {
  authenticated: boolean
  currentUserId: string | null
  role: Role
  page: Page
}

const appSessionStorageKey = 'afg-app-session'

const signedOutSession: AppSession = {
  authenticated: false,
  currentUserId: null,
  role: 'Owner',
  page: 'Dashboard',
}

const loadAppSession = (): AppSession => {
  try {
    // Authentication belongs to the current app window only. Remove sessions
    // saved by older versions so reopening the app always requires a login.
    window.localStorage.removeItem(appSessionStorageKey)
    const saved = window.sessionStorage.getItem(appSessionStorageKey)
    const parsed = saved ? JSON.parse(saved) as Partial<AppSession> : null
    if (!parsed?.authenticated || !parsed.currentUserId) return signedOutSession
    const account = loadUserAccounts().find((user) => user.id === parsed.currentUserId && user.status === 'Active')
    if (!account) return signedOutSession
    const allowedPages = account.role === 'Owner' ? permissionOptions : loadRolePermissions().Admin
    if (!allowedPages.length) return signedOutSession
    const requestedPage = (parsed.page as string) === 'DTF Billing' ? 'DTG Billing' : parsed.page
    const restoredPage = requestedPage && allowedPages.includes(requestedPage as Page)
      ? requestedPage as Page
      : allowedPages.includes('Dashboard') ? 'Dashboard' : allowedPages[0]
    return {
      authenticated: true,
      currentUserId: account.id,
      role: account.role,
      page: restoredPage,
    }
  } catch {
    return signedOutSession
  }
}

const persistAppSession = (session: AppSession) => {
  try {
    window.localStorage.removeItem(appSessionStorageKey)
    if (!session.authenticated || !session.currentUserId) {
      window.sessionStorage.removeItem(appSessionStorageKey)
      return
    }
    window.sessionStorage.setItem(appSessionStorageKey, JSON.stringify(session))
  } catch {
    // The login screen remains available when a browser blocks saved sessions.
  }
}

const defaultLogo = '/afg-logo.jpg'

const companySettingsStorageKey = 'afg-company-settings'
const companySettingsVersionKey = 'afg-company-settings-version'
const companySettingsVersion = '2026-07-official-address'

const officialCompanyIdentity = {
  logo: defaultLogo,
  companyName: 'Al-Fateh Garments',
  businessName: 'AFG',
  address: '16km, Opposite Kamahan Metro Bus Station, Ferozpur Road, Lahore, Pakistan',
  phone: '+92 3008505088',
  whatsapp: '+92 3008505088',
  email: 'alfatehgarments2009@gmail.com',
  website: 'www.afggarments.com',
  currency: 'Rs.',
}

const defaultCompanySettings: CompanySettings = {
  ...officialCompanyIdentity,
  ntn: '',
  strn: '',
  footerMessage: 'Quality garments, reliable service.',
  thankYou: 'Thank you for shopping with Al-fateh Garments.',
  invoicePrefix: 'AFG-INV',
  startingNumber: 1,
  defaultPrintSize: 'A4',
  showLogo: true,
  showSignature: true,
  lowStockLimit: 10,
}

const loadCompanySettings = (): CompanySettings => {
  try {
    const saved = window.localStorage.getItem(companySettingsStorageKey)
    const parsed = saved
      ? JSON.parse(saved) as Partial<CompanySettings> & { exchangePolicy?: string }
      : {}
    const { exchangePolicy: _removedExchangePolicy, ...savedSettings } = parsed
    const needsOfficialBrand = window.localStorage.getItem(companySettingsVersionKey) !== companySettingsVersion
    const merged = {
      ...defaultCompanySettings,
      ...savedSettings,
      ...(needsOfficialBrand ? officialCompanyIdentity : {}),
    }
    const startingNumber = Number(merged.startingNumber)
    const lowStockLimit = Number(merged.lowStockLimit)
    const resolved: CompanySettings = {
      ...merged,
      startingNumber: Number.isFinite(startingNumber) ? Math.max(0, startingNumber) : defaultCompanySettings.startingNumber,
      lowStockLimit: Number.isFinite(lowStockLimit) ? Math.max(0, lowStockLimit) : defaultCompanySettings.lowStockLimit,
      defaultPrintSize: merged.defaultPrintSize === '80mm Thermal' ? '80mm Thermal' : 'A4',
      showLogo: Boolean(merged.showLogo),
      showSignature: Boolean(merged.showSignature),
    }
    if (needsOfficialBrand) {
      window.localStorage.setItem(companySettingsStorageKey, JSON.stringify(resolved))
      window.localStorage.setItem(companySettingsVersionKey, companySettingsVersion)
    }
    return resolved
  } catch {
    // Fall back to the defaults when saved settings are unavailable or invalid.
  }
  return defaultCompanySettings
}

const persistCompanySettings = (settings: CompanySettings) => {
  try {
    window.localStorage.setItem(companySettingsStorageKey, JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}

const initialProducts: Product[] = []
const initialCustomers: Customer[] = []
const initialExpenses: Expense[] = []
const initialStaff: StaffMember[] = []
const initialAttendance: AttendanceRecord[] = []

type BusinessData = {
  products: Product[]
  customers: Customer[]
  expenses: Expense[]
  staff: StaffMember[]
  attendance: AttendanceRecord[]
  pieceRateEntries: PieceRateEntry[]
  salaryAdvances: SalaryAdvance[]
  sales: Sale[]
  invoiceSequence: number
}

const businessDataStorageKey = 'afg-business-data'

const emptyBusinessData: BusinessData = {
  products: initialProducts,
  customers: initialCustomers,
  expenses: initialExpenses,
  staff: initialStaff,
  attendance: initialAttendance,
  pieceRateEntries: [],
  salaryAdvances: [],
  sales: [],
  invoiceSequence: 0,
}

const loadBusinessData = (): BusinessData => {
  try {
    const saved = window.localStorage.getItem(businessDataStorageKey)
    const parsed = saved ? JSON.parse(saved) as Partial<BusinessData> : null
    if (parsed && typeof parsed === 'object') {
      return {
        products: Array.isArray(parsed.products) ? parsed.products : [],
        customers: Array.isArray(parsed.customers) ? parsed.customers : [],
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
        staff: Array.isArray(parsed.staff) ? parsed.staff : [],
        attendance: Array.isArray(parsed.attendance) ? parsed.attendance : [],
        pieceRateEntries: Array.isArray(parsed.pieceRateEntries) ? parsed.pieceRateEntries : [],
        salaryAdvances: Array.isArray(parsed.salaryAdvances) ? parsed.salaryAdvances : [],
        sales: Array.isArray(parsed.sales) ? parsed.sales : [],
        invoiceSequence: Number.isFinite(Number(parsed.invoiceSequence))
          ? Math.max(0, Number(parsed.invoiceSequence))
          : 0,
      }
    }
  } catch {
    // Start with an empty workspace when saved business data is unavailable.
  }
  return emptyBusinessData
}

const persistBusinessData = (data: BusinessData) => {
  try {
    window.localStorage.setItem(businessDataStorageKey, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

const formatMoney = (value: number, currency = 'PKR') => {
  const amount = Math.max(0, value)
  return `${currency === 'PKR' ? 'Rs.' : currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

const sanitizeAmountInput = (value: string) => value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')

const formatAttendanceTime = (value: string) => {
  if (!value || value === '-') return '-'
  if (/\b(am|pm)\b/i.test(value)) return value
  const [hours, minutes] = value.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const attendanceMinutesOf = (value: string) => {
  const normalized = value.trim().replace('.', ':')
  const compact = normalized.match(/^(\d{1,2})(\d{2})\s*(am|pm)?$/i)
  const match = compact || normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!match) return null
  let hours = Number(match[1])
  const minutes = Number(match[2] || 0)
  const meridiem = match[3]?.toLowerCase()
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes > 59) return null
  if (meridiem === 'pm' && hours < 12) hours += 12
  if (meridiem === 'am' && hours === 12) hours = 0
  if (hours > 23) return null
  return hours * 60 + minutes
}

const attendanceStatusForCheckIn = (value: string, shiftStart = '09:00'): AttendanceStatus | null => {
  const minutes = attendanceMinutesOf(value)
  if (minutes === null) return null
  const shiftStartMinutes = attendanceMinutesOf(shiftStart) ?? 9 * 60
  return minutes >= shiftStartMinutes + 15 ? 'Late' : 'Present'
}

const attendanceStatusForTimes = (checkIn: string, checkOut: string, shiftStart: string, shiftEnd: string): AttendanceStatus => {
  if (!checkIn.trim() || checkIn === '-') return 'Absent'
  const checkOutMinutes = checkOut.trim() && checkOut !== '-' ? attendanceMinutesOf(checkOut) : null
  const shiftEndMinutes = attendanceMinutesOf(shiftEnd)
  if (checkOutMinutes !== null && shiftEndMinutes !== null && checkOutMinutes < shiftEndMinutes) return 'Half Day'
  return attendanceStatusForCheckIn(checkIn, shiftStart) || 'Present'
}

const isCustomPrintItem = (item: CartItem) => item.article === 'DTG' || item.article === 'DTF'

const printAreaOf = (item: CartItem) =>
  isCustomPrintItem(item) && Number(item.width) > 0 && Number(item.height) > 0
    ? Number(item.width) * Number(item.height)
    : 0

const amountPerPieceOf = (item: CartItem) =>
  printAreaOf(item) > 0 ? printAreaOf(item) * item.rate : item.rate

const amountOf = (item: CartItem) => {
  if (isCustomPrintItem(item) && printAreaOf(item) > 0) {
    return amountPerPieceOf(item) * item.qty
  }
  return item.qty * item.rate
}

const billingTypeOf = (sale: Sale): 'DTG' | 'POS' =>
  sale.items.length > 0 && sale.items.every(isCustomPrintItem) ? 'DTG' : 'POS'

type CustomerBillingCategory = 'POS' | 'DTG'

type CustomerLedgerProfile = {
  phone: string
  name: string
  category: CustomerBillingCategory
  lastPurchase: string
  invoices: number
  billed: number
  received: number
  remaining: number
  paidBills: number
  pendingBills: number
}

const paymentStateOf = (sale: Sale): PaymentStatus =>
  sale.paymentStatus === 'Pending' || sale.remaining > 0 ? 'Pending' : 'Paid'

const customerProfilesFor = (sales: Sale[], category: CustomerBillingCategory): CustomerLedgerProfile[] => {
  const profiles = new Map<string, CustomerLedgerProfile>()
  sales
    .filter((sale) => billingTypeOf(sale) === category)
    .forEach((sale) => {
      const current = profiles.get(sale.phone)
      const paymentState = paymentStateOf(sale)
      const isLatestSale = !current || sale.date >= current.lastPurchase
      profiles.set(sale.phone, {
        phone: sale.phone,
        name: isLatestSale ? sale.customer : current?.name ?? sale.customer,
        category,
        lastPurchase: !current || sale.date > current.lastPurchase ? sale.date : current.lastPurchase,
        invoices: (current?.invoices ?? 0) + 1,
        billed: (current?.billed ?? 0) + sale.total,
        received: (current?.received ?? 0) + sale.received,
        remaining: (current?.remaining ?? 0) + sale.remaining,
        paidBills: (current?.paidBills ?? 0) + (paymentState === 'Paid' ? 1 : 0),
        pendingBills: (current?.pendingBills ?? 0) + (paymentState === 'Pending' ? 1 : 0),
      })
    })
  return Array.from(profiles.values()).sort((a, b) => (
    b.lastPurchase.localeCompare(a.lastPurchase) || a.name.localeCompare(b.name)
  ))
}

const exportToExcel = (filename: string, headers: string[], rows: Array<Array<string | number>>, rightAlignedColumns: number[] = []) => {
  const escapeCell = (value: string | number) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const headerHtml = headers.map((header) => `<th>${escapeCell(header)}</th>`).join('')
  const rowsHtml = rows.map((row) => `<tr>${row.map((cell, index) => `<td${rightAlignedColumns.includes(index) ? ' style="text-align:right;"' : ''}>${escapeCell(cell)}</td>`).join('')}</tr>`).join('')
  const workbook = `<!doctype html><html><head><meta charset="utf-8"></head><body><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`
  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const exportFormattedExcel = (
  filename: string,
  title: string,
  subtitle: string,
  sections: Array<{
    title: string
    headers: string[]
    rows: Array<Array<string | number>>
    rightAlignedColumns?: number[]
    centerAlignedColumns?: number[]
    highlightLastRow?: boolean
    compact?: boolean
    columnWidths?: number[]
  }>,
) => {
  const escapeCell = (value: string | number) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const sheetName = title.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31).trim() || 'Report'
  const sectionHtml = sections
    .map(({ title: sectionTitle, headers, rows, rightAlignedColumns = [], centerAlignedColumns = [], highlightLastRow = false, compact = false, columnWidths = [] }) => {
      const alignmentClass = (index: number) => rightAlignedColumns.includes(index) ? 'numeric' : centerAlignedColumns.includes(index) ? 'center' : ''
      const headerHtml = headers.map((header, index) => `<th class="${alignmentClass(index)}">${escapeCell(header)}</th>`).join('')
      const colgroupHtml = columnWidths.length === headers.length
        ? `<colgroup>${columnWidths.map((width) => `<col width="${width}" style="width:${width}px;mso-width-source:userset">`).join('')}</colgroup>`
        : ''
      const rowsHtml = rows
        .map((row, rowIndex) => {
          const totalClass = highlightLastRow && rowIndex === rows.length - 1 ? ' class="total-row"' : ''
          const cells = row
            .map((cell, index) => `<td class="${alignmentClass(index)}">${escapeCell(cell)}</td>`)
            .join('')
          return `<tr${totalClass}>${cells}</tr>`
        })
        .join('')
      return `<section class="report-section"><h2>${escapeCell(sectionTitle)}</h2><table${compact ? ' class="compact"' : ''}>${colgroupHtml}<thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml || '<tr><td colspan="99">No records</td></tr>'}</tbody></table></section>`
    })
    .join('')
  const workbook = `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta name="ProgId" content="Excel.Sheet"><xml><o:DocumentProperties><o:Author>AFG UNIT</o:Author></o:DocumentProperties><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${escapeCell(sheetName)}</x:Name><x:WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><x:PageSetup><x:Layout x:Orientation="Landscape" x:CenterHorizontal="True" /><x:Header x:Margin="0.15" /><x:Footer x:Margin="0.15" /><x:PageMargins x:Bottom="0.3" x:Left="0.25" x:Right="0.25" x:Top="0.3" /></x:PageSetup><x:FitToPage /><x:Print><x:ValidPrinterInfo /><x:PaperSizeIndex>9</x:PaperSizeIndex><x:HorizontalResolution>600</x:HorizontalResolution><x:VerticalResolution>600</x:VerticalResolution><x:FitWidth>1</x:FitWidth><x:FitHeight>0</x:FitHeight><x:PrintErrors>Blank</x:PrintErrors></x:Print><x:DoNotDisplayGridlines /><x:Selected /></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><style>
    @page{size:A4 landscape;margin:0.3in 0.25in;mso-page-orientation:landscape;mso-header-margin:0.15in;mso-footer-margin:0.15in}
    body{font-family:Arial,sans-serif;color:#172033;background:#fff;margin:0;font-size:12pt}
    .report{width:100%;margin:0}
    .brand{background:#153b7a;color:#fff;padding:18px 22px;border-bottom:5px solid #d5232a}
    h1{font-size:22pt;line-height:1.2;margin:0} .subtitle{color:#536176;font-size:11pt;margin:12px 0 22px}
    h2{color:#153b7a;font-size:15pt;margin:24px 0 9px;border-bottom:2px solid #d5232a;padding-bottom:6px}
    table{width:100%;border-collapse:collapse;table-layout:auto;font-size:11pt;margin-bottom:22px}
    th{background:#153b7a;color:#fff;font-size:11pt;font-weight:bold;text-align:left;white-space:nowrap;padding:10px 11px;border:1px solid #153b7a}
    td{padding:10px 11px;border:1px solid #cbd5e1;vertical-align:middle;line-height:1.35;word-wrap:break-word}
    thead{display:table-header-group} tr{page-break-inside:avoid}
    table.compact{table-layout:fixed;font-size:9pt}
    table.compact th{font-size:9pt;line-height:1.15;white-space:normal;padding:6px 5px;word-wrap:break-word}
    table.compact td{font-size:9pt;line-height:1.2;padding:6px 5px}
    th.numeric,td.numeric{text-align:right;white-space:nowrap}
    th.center,td.center{text-align:center;white-space:nowrap}
    tbody tr:nth-child(even){background:#f7f9fc}
    .total-row td{background:#fff1f2;font-weight:bold;border-top:2px solid #d5232a}
  </style></head><body><div class="report"><div class="brand"><h1>${escapeCell(title)}</h1></div><p class="subtitle">${escapeCell(subtitle)}</p>${sectionHtml}</div></body></html>`
  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const printStaffDirectory = () => {
  document.body.classList.add('print-staff')
  const cleanup = () => {
    document.body.classList.remove('print-staff')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.setTimeout(() => {
    window.print()
    window.setTimeout(cleanup, 1000)
  }, 80)
}

function App() {
  const [initialSession] = useState<AppSession>(loadAppSession)
  const [initialBusinessDataState] = useState<BusinessData>(loadBusinessData)
  const [authenticated, setAuthenticated] = useState(initialSession.authenticated)
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginCredentials, setLoginCredentials] = useState({ identity: '', password: '' })
  const [loginAttempts, setLoginAttempts] = useState<Record<string, LoginAttempt>>(loadLoginAttempts)
  const [page, setPage] = useState<Page>(initialSession.page)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [role, setRole] = useState<Role>(initialSession.role)
  const [users, setUsers] = useState<UserAccount[]>(loadUserAccounts)
  const [currentUserId, setCurrentUserId] = useState<string | null>(initialSession.currentUserId)
  const [products, setProducts] = useState<Product[]>(initialBusinessDataState.products)
  const [customers, setCustomers] = useState<Customer[]>(initialBusinessDataState.customers)
  const [expenses, setExpenses] = useState<Expense[]>(initialBusinessDataState.expenses)
  const [staff, setStaff] = useState<StaffMember[]>(initialBusinessDataState.staff)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(initialBusinessDataState.attendance)
  const [pieceRateEntries, setPieceRateEntries] = useState<PieceRateEntry[]>(initialBusinessDataState.pieceRateEntries)
  const [salaryAdvances, setSalaryAdvances] = useState<SalaryAdvance[]>(initialBusinessDataState.salaryAdvances)
  const [sales, setSales] = useState<Sale[]>(initialBusinessDataState.sales)
  const [rolePermissions, setRolePermissions] = useState<Record<ManagedRole, Page[]>>(loadRolePermissions)
  const [invoiceSequence, setInvoiceSequence] = useState(initialBusinessDataState.invoiceSequence)
  const [settings, setSettings] = useState<CompanySettings>(loadCompanySettings)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [dtfCustomerName, setDtfCustomerName] = useState('')
  const [dtfCustomerPhone, setDtfCustomerPhone] = useState('')
  const [dtfVehicleNumber, setDtfVehicleNumber] = useState('')
  const [dtfRemarks, setDtfRemarks] = useState('')
  const [dtfCart, setDtfCart] = useState<CartItem[]>([])
  const [dtfReceived, setDtfReceived] = useState('')
  const [dtfPaymentMethod, setDtfPaymentMethod] = useState<PaymentMethod>('Cash')
  const [dtfPaymentStatus, setDtfPaymentStatus] = useState<PaymentStatus>('Paid')
  const [dtfBankName, setDtfBankName] = useState('Meezan')
  const [dtfReference, setDtfReference] = useState('')
  const [received, setReceived] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid')
  const [bankName, setBankName] = useState('Meezan')
  const [reference, setReference] = useState('')
  const [toast, setToast] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [deletionNotifications, setDeletionNotifications] = useState<AppNotification[]>([])
  const [clearedNotificationIds, setClearedNotificationIds] = useState<string[]>([])
  const [previewSale, setPreviewSale] = useState<Sale | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [inventorySearch, setInventorySearch] = useState('')
  const [salesSearch, setSalesSearch] = useState('')
  const [newProduct, setNewProduct] = useState({
    description: '',
    article: '',
    category: 'T-Shirts',
    rate: 0,
    stock: 0,
    image: '',
  })
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [expenseDraft, setExpenseDraft] = useState({
    description: '',
    amount: 0,
    paymentMethod: 'Cash' as PaymentMethod,
    notes: '',
  })
  const currentUser = users.find((account) => account.id === currentUserId)
  const currentUserName = currentUser?.name ?? 'User'

  useEffect(() => {
    window.localStorage.setItem('afg-user-accounts', JSON.stringify(users))
  }, [users])

  useEffect(() => {
    window.localStorage.setItem('afg-role-permissions', JSON.stringify(rolePermissions))
  }, [rolePermissions])

  useEffect(() => {
    window.localStorage.setItem('afg-login-attempts', JSON.stringify(loginAttempts))
  }, [loginAttempts])

  useEffect(() => {
    persistCompanySettings(settings)
    const saveBeforeLeaving = () => persistCompanySettings(settings)
    window.addEventListener('pagehide', saveBeforeLeaving)
    return () => window.removeEventListener('pagehide', saveBeforeLeaving)
  }, [settings])

  useEffect(() => {
    persistAppSession({ authenticated, currentUserId, role, page })
  }, [authenticated, currentUserId, role, page])

  useEffect(() => {
    const businessData = {
      products,
      customers,
      expenses,
      staff,
      attendance,
      pieceRateEntries,
      salaryAdvances,
      sales,
      invoiceSequence,
    }
    persistBusinessData(businessData)
    const saveBeforeLeaving = () => persistBusinessData(businessData)
    window.addEventListener('pagehide', saveBeforeLeaving)
    return () => window.removeEventListener('pagehide', saveBeforeLeaving)
  }, [products, customers, expenses, staff, attendance, pieceRateEntries, salaryAdvances, sales, invoiceSequence])

  const invoiceNumber = useMemo(
    () => `${settings.invoicePrefix}-${String(settings.startingNumber + invoiceSequence).padStart(6, '0')}`,
    [invoiceSequence, settings.invoicePrefix, settings.startingNumber],
  )

  const subtotal = cart.reduce((sum, item) => sum + amountOf(item), 0)
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0)
  const grandTotal = subtotal
  const receivedAmount = Math.max(0, Number(received) || 0)
  const remaining = Math.max(0, grandTotal - receivedAmount)
  const change = Math.max(0, receivedAmount - grandTotal)
  const dtfSubtotal = dtfCart.reduce((sum, item) => sum + amountOf(item), 0)
  const dtfTotalQty = dtfCart.reduce((sum, item) => sum + item.qty, 0)
  const dtgTotalArea = dtfCart.reduce((sum, item) => sum + printAreaOf(item) * item.qty, 0)
  const dtfGrandTotal = dtfSubtotal
  const dtfReceivedAmount = Math.max(0, Number(dtfReceived) || 0)
  const dtfRemaining = Math.max(0, dtfGrandTotal - dtfReceivedAmount)
  const dtfChange = Math.max(0, dtfReceivedAmount - dtfGrandTotal)
  const lowStock = products.filter((product) => product.stock <= product.minStock)
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const cashSales = sales.filter((sale) => sale.method === 'Cash').reduce((sum, sale) => sum + sale.total, 0)
  const bankSales = sales.filter((sale) => sale.method === 'Bank').reduce((sum, sale) => sum + sale.total, 0)
  const allowedBillingTypes: Array<'POS' | 'DTG'> = role === 'Owner'
    ? ['POS', 'DTG']
    : [
        ...(rolePermissions.Admin.includes('POS Billing') ? ['POS' as const] : []),
        ...(rolePermissions.Admin.includes('DTG Billing') ? ['DTG' as const] : []),
      ]
  const visibleSales = sales.filter((sale) => allowedBillingTypes.includes(billingTypeOf(sale)))
  const saleCustomerName = customerName.trim() || 'Walk-in Customer'
  const saleCustomerPhone = customerPhone.trim() || '-'
  const notifications: AppNotification[] = [
    ...deletionNotifications.filter((notification) => !notification.recipientRole || notification.recipientRole === role),
    ...lowStock.map((product) => ({
      id: `stock-${product.id}`,
      title: 'Low stock alert',
      detail: `${product.article} has ${product.stock} item${product.stock === 1 ? '' : 's'} remaining.`,
      icon: AlertTriangle,
      tone: 'warning' as const,
    })),
    ...sales.slice(0, 3).map((sale) => ({
      id: `sale-${sale.invoice}`,
      title: 'Bill saved',
      detail: `${sale.invoice} saved for ${formatMoney(sale.total, settings.currency)}.`,
      icon: ReceiptText,
      tone: 'success' as const,
    })),
  ]
  const visibleNotifications = notifications.filter((notification) => !clearedNotificationIds.includes(notification.id))
  const clearAllNotifications = () => setClearedNotificationIds(notifications.map((notification) => notification.id))

  const filteredProducts = products.filter((product) => {
    const term = inventorySearch.toLowerCase()
    return (
      product.description.toLowerCase().includes(term) ||
      product.article.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term)
    )
  })

  const productResults = products
    .filter((product) => {
      const term = productSearch.toLowerCase()
      return product.description.toLowerCase().includes(term) || product.article.toLowerCase().includes(term) || product.barcode.includes(term)
    })
    .slice(0, 5)

  const currentSale: Sale = {
    invoice: invoiceNumber,
    date: dateText,
    time: timeText,
    customer: saleCustomerName,
    phone: saleCustomerPhone,
    vehicleNumber: vehicleNumber.trim() || undefined,
    items: cart,
    subtotal,
    discount: 0,
    total: grandTotal,
    received: receivedAmount,
    remaining,
    change,
    method: paymentMethod,
    paymentStatus,
    cashier: currentUserName,
    bankName: paymentMethod === 'Bank' ? bankName : undefined,
    reference: reference.trim() || undefined,
  }

  const currentDtgSale: Sale = {
    invoice: invoiceNumber,
    date: dateText,
    time: timeText,
    customer: dtfCustomerName.trim() || 'Walk-in Customer',
    phone: dtfCustomerPhone.trim() || '-',
    vehicleNumber: dtfVehicleNumber.trim() || undefined,
    items: dtfCart,
    subtotal: dtfSubtotal,
    pretreatmentCharge: 0,
    discount: 0,
    total: dtfGrandTotal,
    received: dtfReceivedAmount,
    remaining: dtfRemaining,
    change: dtfChange,
    method: dtfPaymentMethod,
    paymentStatus: dtfPaymentStatus,
    cashier: currentUserName,
    bankName: dtfPaymentMethod === 'Bank' ? dtfBankName : undefined,
    reference: dtfReference.trim() || undefined,
    remarks: dtfRemarks.trim() || undefined,
  }

  const ensureTodayAttendance = () => {
    const todayKey = getTodayText()
    setAttendance((rows) => {
      const existingStaffIds = new Set(rows.filter((record) => record.date === todayKey).map((record) => record.staffId))
      const missingRows = staff
        .filter((member) => member.status === 'Active' && !existingStaffIds.has(member.id))
        .map((member) => ({
          id: `ATT-${todayKey}-${member.id}`,
          staffId: member.id,
          date: todayKey,
          employee: member.name,
          department: member.department,
          checkIn: '-',
          checkOut: '-',
          status: 'Absent' as AttendanceStatus,
        }))
      return missingRows.length ? [...missingRows, ...rows] : rows
    })
  }

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2400)
  }

  const recordDeletion = (entity: string, detail: string) => {
    if (role !== 'Admin') return
    const notification: AppNotification = {
      id: `deletion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: `${entity} deleted by ${role}`,
      detail: `${detail} | Deleted by: ${currentUserName} | Time: ${new Date().toLocaleString()}`,
      icon: Trash2,
      tone: 'danger',
      recipientRole: 'Owner',
    }
    setDeletionNotifications((rows) => [notification, ...rows])
    setNotificationsOpen(false)
    notify(`${entity} deleted. Owner notification added with full details.`)
  }

  const hasVehicleNumber = (value: string) => {
    if (!value.trim()) {
      notify('Enter the vehicle number before printing the invoice.')
      return false
    }
    return true
  }

  const hasCustomerDetails = () => {
    const phoneDigits = customerPhone.replace(/\D/g, '')
    if (!customerName.trim()) {
      notify('Enter customer name before continuing.')
      return false
    }
    if (phoneDigits.length !== 11) {
      notify('Enter a valid customer phone number with exactly 11 digits.')
      return false
    }
    return true
  }

  const hasDtfCustomerDetails = () => {
    const phoneDigits = dtfCustomerPhone.replace(/\D/g, '')
    if (!dtfCustomerName.trim()) {
      notify('Enter DTG customer name before continuing.')
      return false
    }
    if (phoneDigits.length !== 11) {
      notify('Enter a valid DTG customer phone number with exactly 11 digits.')
      return false
    }
    return true
  }

  const syncData = () => {
    notify('Data synced successfully.')
  }

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const username = loginCredentials.identity.trim().toLowerCase()
    const password = loginCredentials.password
    const account = users.find((user) => (
      user.status === 'Active'
      && user.username.toLowerCase() === username
    ))
    const attemptKey = account?.id ?? `identity:${username || 'blank'}`
    const now = Date.now()
    const savedAttempt = loginAttempts[attemptKey]
    if (savedAttempt?.lockedUntil > now) {
      const remainingSeconds = Math.ceil((savedAttempt.lockedUntil - now) / 1000)
      setLoginError(`Login is locked. Try again in ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}.`)
      return
    }
    if (account && account.password === password) {
      setLoginAttempts((current) => {
        const next = { ...current }
        delete next[attemptKey]
        return next
      })
      const allowedPages = account.role === 'Owner' ? permissionOptions : rolePermissions.Admin
      if (!allowedPages.length) {
        setLoginError('The Owner has not assigned any interface pages to this Admin account.')
        return
      }
      setCurrentUserId(account.id)
      setRole(account.role)
      ensureTodayAttendance()
      setAuthenticated(true)
      setLoginError('')
      setLoginCredentials({ identity: '', password: '' })
      const nextPage = allowedPages.includes('Dashboard') ? 'Dashboard' : allowedPages[0]
      setPage(nextPage)
      persistAppSession({
        authenticated: true,
        currentUserId: account.id,
        role: account.role,
        page: nextPage,
      })
      return
    }
    const failedAttempts = (savedAttempt?.lockedUntil && savedAttempt.lockedUntil <= now ? 0 : savedAttempt?.attempts ?? 0) + 1
    if (failedAttempts >= 5) {
      setLoginAttempts((current) => ({
        ...current,
        [attemptKey]: { attempts: 0, lockedUntil: now + 60_000 },
      }))
      setLoginError('Five failed attempts. Login is locked for 1 minute.')
      return
    }
    setLoginAttempts((current) => ({
      ...current,
      [attemptKey]: { attempts: failedAttempts, lockedUntil: 0 },
    }))
    const attemptsRemaining = 5 - failedAttempts
    setLoginError(`Incorrect username, email, or password. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`)
  }

  const addProductToCart = (product: Product) => {
    if (!hasCustomerDetails()) return
    if (product.stock <= 0) {
      notify('This product is out of stock.')
      return
    }
    setCart((items) => {
      const existing = items.find((item) => item.productId === product.id)
      if (existing) {
      return items.map((item) =>
          item.productId === product.id
            ? { ...item, qty: item.qty + 1 }
            : item,
        )
      }
      return [...items, { productId: product.id, description: product.description, article: product.article, image: product.image, qty: 1, rate: product.rate }]
    })
    setProductSearch('')
  }

  const addDtfItem = () => {
    if (!hasDtfCustomerDetails()) return
    setDtfCart((items) => [
      ...items,
      {
        productId: `DTG-${Date.now()}-${items.length}`,
        description: '',
        article: 'DTG',
        width: 0,
        height: 0,
        qty: 1,
        rate: 0,
      },
    ])
  }

  const updateDtfItem = (id: string, changes: Partial<CartItem>) => {
    setDtfCart((items) => items.map((item) => (item.productId === id ? { ...item, ...changes } : item)))
  }

  const clearDtfBill = () => {
    setDtfCart([])
    setDtfCustomerName('')
    setDtfCustomerPhone('')
    setDtfVehicleNumber('')
    setDtfRemarks('')
    setDtfReceived('')
    setDtfPaymentMethod('Cash')
    setDtfPaymentStatus('Paid')
    setDtfBankName('Meezan')
    setDtfReference('')
  }

  const updateQty = (productId: string, qty: number) => {
    const safeQty = Math.max(1, Math.floor(Number.isFinite(qty) ? qty : 1))
    setCart((items) => items.map((item) => (item.productId === productId ? { ...item, qty: safeQty } : item)))
  }

  const updateRate = (productId: string, rate: number) => {
    setCart((items) => items.map((item) => (item.productId === productId ? { ...item, rate: Math.max(0, rate) } : item)))
  }

  const clearBill = () => {
    setCart([])
    setReceived('')
    setPaymentMethod('Cash')
    setPaymentStatus('Paid')
    setCustomerName('')
    setCustomerPhone('')
    setVehicleNumber('')
    setConfirmClear(false)
  }

  const saveSale = (print = false) => {
    if (!hasCustomerDetails()) return
    if (!cart.length) {
      notify('Add at least one item before saving.')
      return
    }
    if (print && receivedAmount <= 0) {
      notify('Enter the received amount before printing the bill.')
      return
    }
    if (print && !hasVehicleNumber(vehicleNumber)) return
    const sale = { ...currentSale, items: cart.map((item) => ({ ...item })) }
    setSales((rows) => [sale, ...rows])
    setProducts((rows) =>
      rows.map((product) => {
        const sold = cart.find((item) => item.productId === product.id)
        return sold ? { ...product, stock: product.stock - sold.qty } : product
      }),
    )
    setCustomers((rows) => {
      const found = rows.some((customer) => customer.phone === saleCustomerPhone)
      const next = rows.map((customer) =>
        customer.phone === saleCustomerPhone
          ? {
              ...customer,
              name: saleCustomerName,
              totalPurchases: customer.totalPurchases + grandTotal,
              totalPaid: customer.totalPaid + receivedAmount,
              lastPurchase: dateText,
            }
          : customer,
      )
      return found
        ? next
        : [
            ...next,
            {
              name: saleCustomerName,
              phone: saleCustomerPhone,
              address: '',
              totalPurchases: grandTotal,
              totalPaid: receivedAmount,
              lastPurchase: dateText,
            },
          ]
    })
    setInvoiceSequence((value) => value + 1)
    setPreviewSale(sale)
    clearBill()
    notify('Sale completed successfully.')
    if (print) window.setTimeout(() => window.print(), 200)
  }

  const saveDtfSale = (print = false) => {
    if (!hasDtfCustomerDetails()) return
    if (!dtfCart.length) {
      notify('Add at least one DTG print item before saving.')
      return
    }
    if (dtfCart.some((item) => (
      !item.description.trim()
      || Number(item.width) <= 0
      || Number(item.height) <= 0
      || item.qty <= 0
      || item.rate <= 0
    ))) {
      notify('Complete every DTG item with a name, width, height, rate, and pieces.')
      return
    }
    if (print && dtfReceivedAmount <= 0) {
      notify('Enter the received amount before printing the DTG bill.')
      return
    }
    if (print && !hasVehicleNumber(dtfVehicleNumber)) return
    const sale = { ...currentDtgSale, items: dtfCart.map((item) => ({ ...item })) }
    setSales((rows) => [sale, ...rows])
    setCustomers((rows) => {
      const found = rows.some((customer) => customer.phone === sale.phone)
      const next = rows.map((customer) =>
        customer.phone === sale.phone
          ? {
              ...customer,
              name: sale.customer,
              totalPurchases: customer.totalPurchases + sale.total,
              totalPaid: customer.totalPaid + sale.received,
              lastPurchase: dateText,
            }
          : customer,
      )
      return found
        ? next
        : [
            ...next,
            {
              name: sale.customer,
              phone: sale.phone,
              address: '',
              totalPurchases: sale.total,
              totalPaid: sale.received,
              lastPurchase: dateText,
            },
          ]
    })
    setInvoiceSequence((value) => value + 1)
    setPreviewSale(sale)
    clearDtfBill()
    notify('DTG bill completed successfully.')
    if (print) window.setTimeout(() => window.print(), 200)
  }

  const printSavedSale = (sale: Sale) => {
    if (sale.received <= 0) {
      notify('Enter the received amount before printing the bill.')
      return
    }
    if (!hasVehicleNumber(sale.vehicleNumber || '')) return
    setPreviewSale(sale)
    window.setTimeout(() => window.print(), 200)
  }

  const addProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newProduct.description || !newProduct.article || newProduct.rate < 0 || newProduct.stock < 0) {
      notify('Complete product details with valid numbers.')
      return
    }
    if (products.some((product) => product.article === newProduct.article && product.id !== editingProductId)) {
      notify('Article number must be unique.')
      return
    }
    if (editingProductId) {
      setProducts((rows) =>
        rows.map((product) =>
          product.id === editingProductId
            ? { ...product, ...newProduct, cost: Math.round(newProduct.rate * 0.7), minStock: settings.lowStockLimit }
            : product,
        ),
      )
      setEditingProductId(null)
      setNewProduct({ description: '', article: '', category: 'T-Shirts', rate: 0, stock: 0, image: '' })
      notify('Product updated successfully.')
      return
    }
    setProducts((rows) => [
      {
        id: `P-${1000 + rows.length + 1}`,
        barcode: `${Date.now()}`.slice(-7),
        unit: 'Pc',
        cost: Math.round(newProduct.rate * 0.7),
        minStock: settings.lowStockLimit,
        status: 'Active',
        created: dateText,
        ...newProduct,
      },
      ...rows,
    ])
    setNewProduct({ description: '', article: '', category: 'T-Shirts', rate: 0, stock: 0, image: '' })
    notify('Product added successfully.')
  }

  const editProduct = (product: Product) => {
    setEditingProductId(product.id)
    setNewProduct({
      description: product.description,
      article: product.article,
      category: product.category,
      rate: product.rate,
      stock: product.stock,
      image: product.image || '',
    })
  }

  const cancelProductEdit = () => {
    setEditingProductId(null)
    setNewProduct({ description: '', article: '', category: 'T-Shirts', rate: 0, stock: 0, image: '' })
  }

  const addExpense = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!expenseDraft.description || expenseDraft.amount <= 0) {
      notify('Enter a description and amount for the expense.')
      return
    }
    setExpenses((rows) => [
      {
        id: `EXP-${String(rows.length + 1).padStart(3, '0')}`,
        date: dateText,
        addedBy: currentUserName,
        ...expenseDraft,
      },
      ...rows,
    ])
    setExpenseDraft({ description: '', amount: 0, paymentMethod: 'Cash', notes: '' })
    notify('Expense added successfully.')
  }

  if (!authenticated) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="brand-lockup">
            <img src={settings.logo} alt="AFG logo" />
            <div>
              <h1>{settings.businessName}</h1>
              <p>{settings.companyName}</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="login-form">
            <label>
              Username
              <input
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Enter username"
                value={loginCredentials.identity}
                onChange={(event) => setLoginCredentials((current) => ({ ...current, identity: event.target.value }))}
                required
              />
            </label>
            <label>
              Password
              <span className="password-field">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={loginCredentials.password}
                  onChange={(event) => setLoginCredentials((current) => ({ ...current, password: event.target.value }))}
                  required
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Show password">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            {loginError && <p className="form-error">{loginError}</p>}
            <button className="primary-btn" type="submit">
              Login
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <div className="app-shell">
      {toast && <div className="toast">{toast}</div>}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="side-brand">
          <img src={settings.logo} alt="AFG logo" />
          <div>
            <strong>{settings.businessName}</strong>
            <span>{settings.companyName}</span>
          </div>
        </div>
        <nav>
          {(
            [
              ['Dashboard', LayoutDashboard],
               ['POS Billing', ShoppingCart],
               ['DTG Billing', ReceiptText],
               ['Sales', ReceiptText],
               ['Customers', Users],
               ['Inventory', Boxes],
              ['Expenses', WalletCards],
              ['Staff', UserPlus],
              ['Salary', Banknote],
              ['Attendance', CalendarCheck],
              ['Reports', ChartColumn],
              ['Users', UserCog],
              ['Settings', Settings],
            ] as const
          )
            .filter(([item]) => role === 'Owner' || rolePermissions.Admin.includes(item))
            .map(([item, Icon]) => (
            <button
              key={item}
              className={page === item ? 'active' : ''}
              onClick={() => {
                if (role !== 'Owner' && !rolePermissions.Admin.includes(item)) {
                  notify(`${item} access is disabled for ${role}.`)
                  return
                }
                setPage(item)
                setSidebarOpen(false)
              }}
            >
              <Icon size={18} /> {item}
            </button>
          ))}
        </nav>
        <button className="logout" onClick={() => {
          if (cart.length || dtfCart.length) {
            notify('Clear or save the current bill before logout.')
            return
          }
          persistAppSession(signedOutSession)
          setAuthenticated(false)
          setCurrentUserId(null)
          setLoginCredentials({ identity: '', password: '' })
          setShowPassword(false)
        }}>
          <LogOut size={18} /> Logout
        </button>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div>
            <h2>{page}</h2>
            <span>{today.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          <div className="top-actions">
            <div className="header-search">
              <Search size={16} />
              <input placeholder="Search invoices, products, customers" />
            </div>
            <button className="sync-btn" onClick={syncData} title="Sync data">
              <RefreshCw size={17} /> <span>Sync</span>
            </button>
            <div className="notification-wrap">
              <button
                className="notification"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                title="View notifications"
                onClick={() => setNotificationsOpen((value) => !value)}
              >
                <Bell size={19} />
                {visibleNotifications.length > 0 && <b>{visibleNotifications.length}</b>}
              </button>
              {notificationsOpen && (
                <div className="notification-panel" role="dialog" aria-label="Notifications">
                  <div className="notification-panel-heading">
                    <div>
                      <strong>Notifications</strong>
                      <small>{visibleNotifications.length ? `${visibleNotifications.length} updates` : 'All clear'}</small>
                    </div>
                    <div className="notification-panel-actions">
                      <button className="notification-clear" onClick={clearAllNotifications} disabled={!visibleNotifications.length}>
                        <Trash2 size={14} /> Clear all
                      </button>
                      <button className="icon-btn" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  {visibleNotifications.length ? (
                    <div className="notification-list">
                      {visibleNotifications.map(({ id, title, detail, icon: Icon, tone }) => (
                        <div className="notification-item" key={id}>
                          <span className={`notification-item-icon ${tone}`}><Icon size={16} /></span>
                          <div>
                            <strong>{title}</strong>
                            <p>{detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="notification-empty">No new notifications.</p>
                  )}
                </div>
              )}
            </div>
            <div className="profile">
              <span>{currentUserName}</span>
              <small>{role}</small>
              <ChevronDown size={16} />
            </div>
          </div>
        </header>

        <section key={page} className="page-content">
          {page === 'Dashboard' && (
            <Dashboard
              values={{ sales, cashSales, bankSales, totalExpenses, customers, products, lowStock }}
              currency={settings.currency}
              setPage={setPage}
              canStartSale={role === 'Owner' || rolePermissions.Admin.includes('POS Billing')}
            />
          )}
          {page === 'POS Billing' && (
            <POS
              invoiceNumber={invoiceNumber}
              cart={cart}
              settings={settings}
              productSearch={productSearch}
              setProductSearch={setProductSearch}
              productResults={productResults}
              addProductToCart={addProductToCart}
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              vehicleNumber={vehicleNumber}
              setVehicleNumber={setVehicleNumber}
              updateQty={updateQty}
              updateRate={updateRate}
              removeItem={(id) => setCart((items) => items.filter((item) => item.productId !== id))}
              totals={{ totalQty, subtotal, grandTotal, remaining, change }}
              received={received}
              setReceived={setReceived}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              paymentStatus={paymentStatus}
              setPaymentStatus={setPaymentStatus}
              bankName={bankName}
              setBankName={setBankName}
              reference={reference}
              setReference={setReference}
              saveSale={saveSale}
              preview={() => {
                if (hasCustomerDetails()) setPreviewSale(currentSale)
              }}
              clear={() => (cart.length ? setConfirmClear(true) : clearBill())}
              userName={currentUserName}
            />
          )}
          {page === 'DTG Billing' && (
            <DTGBilling
              invoiceNumber={invoiceNumber}
              settings={settings}
              items={dtfCart}
              customerName={dtfCustomerName}
              setCustomerName={setDtfCustomerName}
              customerPhone={dtfCustomerPhone}
              setCustomerPhone={setDtfCustomerPhone}
              vehicleNumber={dtfVehicleNumber}
              setVehicleNumber={setDtfVehicleNumber}
              remarks={dtfRemarks}
              setRemarks={setDtfRemarks}
              addItem={addDtfItem}
              updateItem={updateDtfItem}
              removeItem={(id) => setDtfCart((items) => items.filter((item) => item.productId !== id))}
              totals={{
                totalQty: dtfTotalQty,
                totalArea: dtgTotalArea,
                subtotal: dtfSubtotal,
                grandTotal: dtfGrandTotal,
                remaining: dtfRemaining,
                change: dtfChange,
              }}
              received={dtfReceived}
              setReceived={setDtfReceived}
              paymentMethod={dtfPaymentMethod}
              setPaymentMethod={setDtfPaymentMethod}
              paymentStatus={dtfPaymentStatus}
              setPaymentStatus={setDtfPaymentStatus}
              bankName={dtfBankName}
              setBankName={setDtfBankName}
              reference={dtfReference}
              setReference={setDtfReference}
              saveSale={saveDtfSale}
              preview={() => {
                const hasInvalidItem = dtfCart.some((item) => (
                  !item.description.trim()
                  || Number(item.width) <= 0
                  || Number(item.height) <= 0
                  || item.qty <= 0
                  || item.rate <= 0
                ))
                if (hasDtfCustomerDetails() && dtfCart.length && !hasInvalidItem) {
                  setPreviewSale(currentDtgSale)
                }
              }}
              clear={clearDtfBill}
              userName={currentUserName}
            />
          )}
          {page === 'Inventory' && (
            <Inventory
              products={filteredProducts}
              search={inventorySearch}
              setSearch={setInventorySearch}
              addProduct={addProduct}
              draft={newProduct}
              setDraft={setNewProduct}
              editingProductId={editingProductId}
              editProduct={editProduct}
              cancelEdit={cancelProductEdit}
              deleteProduct={(id) => {
                const product = products.find((item) => item.id === id)
                if (!product) return
                setProducts((rows) => rows.filter((product) => product.id !== id))
                if (editingProductId === id) cancelProductEdit()
                recordDeletion(
                  'Product',
                  `Product ID: ${product.id} | Description: ${product.description} | Article: ${product.article} | Barcode: ${product.barcode} | Category: ${product.category} | Unit: ${product.unit} | Cost: ${formatMoney(product.cost, settings.currency)} | Rate: ${formatMoney(product.rate, settings.currency)} | Stock: ${product.stock} | Minimum stock: ${product.minStock} | Status: ${product.status} | Created: ${product.created} | Image: ${product.image ? 'Attached' : 'None'}`,
                )
              }}
              exportInventory={() =>
                exportToExcel(
                  'afg-inventory',
                  ['Product ID', 'Description', 'Article', 'Category', 'Rate', 'Stock', 'Status'],
                  filteredProducts.map((product) => [
                    product.id,
                    product.description,
                    product.article,
                    product.category,
                    formatMoney(product.rate, settings.currency),
                    product.stock,
                    product.stock === 0 ? 'Out of Stock' : product.stock <= product.minStock ? 'Low Stock' : 'In Stock',
                  ]),
                )
              }
              currency={settings.currency}
              role={role}
            />
          )}
          {page === 'Sales' && (
            <SalesPage
              sales={visibleSales.filter((sale) => `${sale.invoice} ${sale.customer} ${sale.phone}`.toLowerCase().includes(salesSearch.toLowerCase()))}
              billingTypes={allowedBillingTypes}
              search={salesSearch}
              setSearch={setSalesSearch}
              preview={setPreviewSale}
              print={printSavedSale}
              products={products}
              editSale={(updatedSale) => {
                const originalSale = sales.find((sale) => sale.invoice === updatedSale.invoice)
                if (!originalSale) return
                if (billingTypeOf(originalSale) === 'POS') {
                  const originalQuantities = new Map(originalSale.items.map((item) => [item.productId, item.qty]))
                  const updatedQuantities = new Map(updatedSale.items.map((item) => [item.productId, item.qty]))
                  setProducts((rows) => rows.map((product) => ({
                    ...product,
                    stock: Math.max(
                      0,
                      product.stock
                        + (originalQuantities.get(product.id) ?? 0)
                        - (updatedQuantities.get(product.id) ?? 0),
                    ),
                  })))
                }
                setCustomers((rows) => {
                  const adjusted = rows.map((customer) => (
                    customer.phone === originalSale.phone
                      ? {
                          ...customer,
                          totalPurchases: Math.max(0, customer.totalPurchases - originalSale.total),
                          totalPaid: Math.max(0, customer.totalPaid - originalSale.received),
                        }
                      : customer
                  ))
                  const existingCustomer = adjusted.some((customer) => customer.phone === updatedSale.phone)
                  if (existingCustomer) {
                    return adjusted.map((customer) => (
                      customer.phone === updatedSale.phone
                        ? {
                            ...customer,
                            name: updatedSale.customer,
                            totalPurchases: customer.totalPurchases + updatedSale.total,
                            totalPaid: customer.totalPaid + updatedSale.received,
                            lastPurchase: updatedSale.date,
                          }
                        : customer
                    ))
                  }
                  return [
                    ...adjusted,
                    {
                      name: updatedSale.customer,
                      phone: updatedSale.phone,
                      address: '',
                      totalPurchases: updatedSale.total,
                      totalPaid: updatedSale.received,
                      lastPurchase: updatedSale.date,
                    },
                  ]
                })
                setSales((rows) => rows.map((sale) => (
                  sale.invoice === updatedSale.invoice ? updatedSale : sale
                )))
                notify(`${updatedSale.invoice} updated successfully.`)
              }}
              exportSales={() =>
                exportToExcel(
                  'afg-sales',
                  ['Invoice Number', 'Billing Type', 'Date', 'Time', 'Customer', 'Phone', 'Total Quantity', 'Grand Total', 'Paid Amount', 'Remaining Amount', 'Payment Method', 'Processed By'],
                  visibleSales
                    .filter((sale) => `${sale.invoice} ${sale.customer} ${sale.phone}`.toLowerCase().includes(salesSearch.toLowerCase()))
                    .map((sale) => [
                      sale.invoice,
                      billingTypeOf(sale) === 'DTG' ? 'DTG Billing' : 'POS Billing',
                      sale.date,
                      sale.time,
                      sale.customer,
                      sale.phone,
                      sale.items.reduce((sum, item) => sum + item.qty, 0),
                      formatMoney(sale.total, settings.currency),
                      formatMoney(sale.received, settings.currency),
                      formatMoney(sale.remaining, settings.currency),
                      sale.method,
                      sale.cashier,
                    ]),
                )
              }
              currency={settings.currency}
              role={role}
              deleteSale={(invoice) => {
                const sale = sales.find((item) => item.invoice === invoice)
                if (!sale) return
                setSales((rows) => rows.filter((item) => item.invoice !== invoice))
                recordDeletion(
                  'Sale',
                  `Invoice: ${sale.invoice} | Billing: ${billingTypeOf(sale)} | Customer: ${sale.customer} | Phone: ${sale.phone} | Vehicle: ${sale.vehicleNumber || '-'} | Items: ${sale.items.map((item) => `${item.description} (${item.width && item.height ? `${item.width} x ${item.height} in = ${printAreaOf(item)} sq in, ${formatMoney(amountPerPieceOf(item), settings.currency)} per piece, ` : ''}${item.qty} pieces = ${formatMoney(amountOf(item), settings.currency)})`).join('; ') || '-'} | Printing total: ${formatMoney(sale.subtotal, settings.currency)} | Total: ${formatMoney(sale.total, settings.currency)} | Received: ${formatMoney(sale.received, settings.currency)} | Remaining: ${formatMoney(sale.remaining, settings.currency)} | Payment: ${sale.method}${sale.bankName ? ` / ${sale.bankName}` : ''} | Status: ${sale.paymentStatus} | Reference: ${sale.reference || '-'} | Remarks: ${sale.remarks || '-'} | Processed by: ${sale.cashier}`,
                )
              }}
            />
          )}
          {page === 'Customers' && (
            <CustomersPage
              sales={visibleSales}
              billingTypes={allowedBillingTypes}
              currency={settings.currency}
            />
          )}
          {page === 'Expenses' && (
            <ExpensesPage
              expenses={expenses}
              draft={expenseDraft}
              setDraft={setExpenseDraft}
              addExpense={addExpense}
              exportExpenses={(periodExpenses, periodLabel, periodTotal) =>
                exportFormattedExcel(
                  `afg-expenses-${periodLabel.toLowerCase().replaceAll(' ', '-')}`,
                  'AFG UNIT | Expense Report',
                  `${periodLabel} | ${periodExpenses.length} record${periodExpenses.length === 1 ? '' : 's'} | Total: ${formatMoney(periodTotal, settings.currency)}`,
                  [
                    {
                      title: `${periodLabel} Expenses`,
                      headers: ['Expense ID', 'Date', 'Description', 'Amount', 'Payment Method', 'Added By', 'Notes'],
                      rows: [
                        ...periodExpenses.map((expense) => [
                          expense.id,
                          expense.date,
                          expense.description,
                          formatMoney(expense.amount, settings.currency),
                          expense.paymentMethod,
                          expense.addedBy,
                          expense.notes,
                        ]),
                        ['', '', 'TOTAL EXPENSES', formatMoney(periodTotal, settings.currency), '', '', ''],
                      ],
                      rightAlignedColumns: [3],
                      centerAlignedColumns: [0, 1, 4],
                      highlightLastRow: true,
                    },
                  ],
                )
              }
              currency={settings.currency}
            />
          )}
          {page === 'Staff' && <StaffPage staff={staff} setStaff={setStaff} role={role} currency={settings.currency} />}
          {page === 'Salary' && (
            <SalaryPage
              staff={staff}
              setStaff={setStaff}
              attendance={attendance}
              pieceRateEntries={pieceRateEntries}
              setPieceRateEntries={setPieceRateEntries}
              salaryAdvances={salaryAdvances}
              setSalaryAdvances={setSalaryAdvances}
              role={role}
              currency={settings.currency}
              notify={notify}
              recordDeletion={recordDeletion}
              userName={currentUserName}
            />
          )}
          {page === 'Attendance' && <AttendancePage records={attendance} setRecords={setAttendance} staff={staff} role={role} />}
          {page === 'Reports' && (
            <ReportsPage
              sales={visibleSales}
              billingTypes={allowedBillingTypes}
              expenses={expenses}
              products={products}
              currency={settings.currency}
            />
          )}
          {page === 'Users' && (
            <UsersPage
              role={role}
              users={users}
              setUsers={setUsers}
              currentUserId={currentUserId}
              permissions={rolePermissions}
              setPermissions={setRolePermissions}
            />
          )}
          {page === 'Settings' && <SettingsPage settings={settings} setSettings={setSettings} />}
        </section>
      </main>

      {sidebarOpen && <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />}
      {previewSale && (
        <InvoiceModal
          sale={previewSale}
          settings={settings}
          onClose={() => setPreviewSale(null)}
          onPrint={() => {
            if (previewSale.received <= 0) {
              notify('Enter the received amount before printing the bill.')
              return
            }
            if (!hasVehicleNumber(previewSale.vehicleNumber || '')) return
            window.print()
          }}
        />
      )}
      {confirmClear && (
        <div className="modal-backdrop">
          <div className="confirm-box">
            <h3>Clear current bill?</h3>
            <p>This will remove all items from the billing table.</p>
            <div className="button-row">
              <button className="ghost-btn" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
              <button className="danger-btn" onClick={clearBill}>
                Clear Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Dashboard({
  values,
  currency,
  setPage,
  canStartSale,
}: {
  values: {
    sales: Sale[]
    cashSales: number
    bankSales: number
    totalExpenses: number
    customers: Customer[]
    products: Product[]
    lowStock: Product[]
  }
  currency: string
  setPage: (page: Page) => void
  canStartSale: boolean
}) {
  const totalSales = values.sales.reduce((sum, sale) => sum + sale.total, 0)
  const paymentTotal = values.cashSales + values.bankSales
  const cashShare = paymentTotal ? (values.cashSales / paymentTotal) * 100 : 50
  const bankShare = paymentTotal ? (values.bankSales / paymentTotal) * 100 : 50
  const bankEnd = cashShare + bankShare
  const cards = [
    ['Today Sales', formatMoney(totalSales, currency), '+ ready live', BadgeDollarSign],
    ['Today Bills', values.sales.length, 'vs previous day', ReceiptText],
    ['Cash Sales', formatMoney(values.cashSales, currency), 'counter cash', Banknote],
    ['Bank Sales', formatMoney(values.bankSales, currency), 'transfers', CreditCard],
    ['Total Expenses', formatMoney(values.totalExpenses, currency), 'today', WalletCards],
    ['Customers', values.customers.length, 'active profiles', Users],
    ['Stock Items', values.products.length, 'catalogued', Boxes],
    ['Low Stock', values.lowStock.length, 'needs attention', AlertTriangle],
  ] as const
  return (
    <div className="dashboard-grid dashboard-view">
      <div className="summary-grid">
        {cards.map(([title, value, hint, Icon]) => (
          <article className="metric-card" key={title}>
            <Icon size={22} />
            <span>{title}</span>
            <strong>{value}</strong>
            <small>{hint}</small>
          </article>
        ))}
      </div>
      <section className="panel wide sales-performance-panel">
        <div className="panel-title">
          <h3>Sales Performance</h3>
          {canStartSale && <button onClick={() => setPage('POS Billing')}>New Sale</button>}
        </div>
        <div className="bar-chart">
          {[32, 48, 28, 58, 74, 44, Math.max(20, values.sales.length * 18)].map((height, index) => (
            <span key={index} style={{ height: `${height}%`, '--bar-index': index } as React.CSSProperties} />
          ))}
        </div>
      </section>
      <section className="panel payment-breakdown-panel">
        <h3>Payment Breakdown</h3>
        <div
          className="donut"
          style={{ background: `conic-gradient(var(--blue) 0 ${cashShare}%, var(--red) ${cashShare}% ${bankEnd}%, #dbe7f7 ${bankEnd}% 100%)` }}
        >
          <b>{values.sales.length}</b>
          <span>bills</span>
        </div>
        <div className="legend">
          <span>Cash</span>
          <span>Bank</span>
        </div>
      </section>
    </div>
  )
}

function POS(props: {
  invoiceNumber: string
  cart: CartItem[]
  settings: CompanySettings
  productSearch: string
  setProductSearch: (value: string) => void
  productResults: Product[]
  addProductToCart: (product: Product) => void
  customerName: string
  setCustomerName: (value: string) => void
  customerPhone: string
  setCustomerPhone: (value: string) => void
  vehicleNumber: string
  setVehicleNumber: (value: string) => void
  updateQty: (id: string, qty: number) => void
  updateRate: (id: string, rate: number) => void
  removeItem: (id: string) => void
  totals: { totalQty: number; subtotal: number; grandTotal: number; remaining: number; change: number }
  received: string
  setReceived: (value: string) => void
  paymentMethod: PaymentMethod
  setPaymentMethod: (value: PaymentMethod) => void
  paymentStatus: PaymentStatus
  setPaymentStatus: (value: PaymentStatus) => void
  bankName: string
  setBankName: (value: string) => void
  reference: string
  setReference: (value: string) => void
  saveSale: (print?: boolean) => void
  preview: () => void
  clear: () => void
  userName: string
}) {
  return (
    <div className="pos-layout">
      <section className="pos-main">
        <div className="customer-strip">
          <label>
            Customer Name
            <input placeholder="Walk-in Customer" value={props.customerName} onChange={(event) => props.setCustomerName(event.target.value)} />
          </label>
          <label>
            Customer Phone
            <input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              placeholder="11-digit phone number"
              value={props.customerPhone}
              onChange={(event) => props.setCustomerPhone(event.target.value.replace(/\D/g, '').slice(0, 11))}
            />
          </label>
          <label>
            Vehicle Number *
            <input
              placeholder="Required for printing"
              maxLength={20}
              required
              value={props.vehicleNumber}
              onChange={(event) => props.setVehicleNumber(event.target.value.toUpperCase())}
            />
          </label>
          <label>
            Invoice Number
            <input value={props.invoiceNumber} readOnly />
          </label>
          <label>
            Salesperson
            <input value={props.userName} readOnly />
          </label>
        </div>
        <div className="product-entry">
          <Search size={18} />
          <input
            value={props.productSearch}
            onChange={(event) => props.setProductSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              const product = props.productResults[0]
              if (product) {
                props.addProductToCart(product)
              }
            }}
            placeholder="Search product, article number, or scan barcode"
          />
          <button className="primary-btn" type="button" onClick={() => props.productResults[0] && props.addProductToCart(props.productResults[0])}>
            <Plus size={17} /> Add Item
          </button>
          {props.productSearch && (
            <div className="search-results">
              {props.productResults.map((product) => (
                <button key={product.id} onClick={() => props.addProductToCart(product)}>
                  <span className="product-result-main">
                    {product.image ? <img className="product-thumb small" src={product.image} alt="" /> : <span className="product-thumb-placeholder small">No image</span>}
                    <span>
                      {product.description} <b>{product.article}</b>
                    </span>
                  </span>
                  <small>
                    {formatMoney(product.rate, props.settings.currency)} | Stock {product.stock}
                  </small>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="table-wrap billing-table">
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Description</th>
                <th>Article</th>
                <th>Qty.</th>
                <th>Rate</th>
                <th>Total (Qty x Rate)</th>
                <th className="screen-only">Action</th>
              </tr>
            </thead>
            <tbody>
              {props.cart.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-cell" data-label="">
                    Search a product or scan a barcode to begin billing.
                  </td>
                </tr>
              )}
              {props.cart.map((item, index) => (
                <tr key={item.productId}>
                  <td data-label="No.">{index + 1}</td>
                  <td data-label="Description">
                    <span className="billing-product-cell">
                      {item.image ? <img className="product-thumb" src={item.image} alt="" /> : <span className="product-thumb-placeholder">No image</span>}
                      <span>{item.description}</span>
                    </span>
                  </td>
                  <td data-label="Article">{item.article}</td>
                  <td data-label="Qty.">
                    <div className="qty-control">
                      <button onClick={() => props.updateQty(item.productId, item.qty - 1)}>
                        <Minus size={14} />
                      </button>
                      <QuantityInput value={item.qty} onChange={(value) => props.updateQty(item.productId, value)} />
                      <button onClick={() => props.updateQty(item.productId, item.qty + 1)}>
                        <Plus size={14} />
                      </button>
                    </div>
                  </td>
                  <td data-label="Rate">
                    <input className="rate-input" type="number" placeholder="Rate" value={item.rate || ''} onChange={(event) => props.updateRate(item.productId, Number(event.target.value))} />
                  </td>
                  <td data-label="Total (Qty x Rate)">{formatMoney(item.qty * item.rate, props.settings.currency)}</td>
                  <td className="screen-only" data-label="Action">
                    <button className="icon-btn danger" onClick={() => props.removeItem(item.productId)} aria-label="Delete item">
                      <Trash2 size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="bill-summary">
        <h3>Bill Summary</h3>
        <SummaryLine label="Total Quantity" value={`${props.totals.totalQty}`} />
        <SummaryLine label="Subtotal" value={formatMoney(props.totals.subtotal, props.settings.currency)} />
        <SummaryLine label="Grand Total" value={formatMoney(props.totals.grandTotal, props.settings.currency)} strong />
          <label>
            Received Amount
            <input
              type="number"
              min={0}
              placeholder="Enter received amount"
              value={props.received}
              onChange={(event) => props.setReceived(sanitizeAmountInput(event.target.value))}
            />
          </label>
        <SummaryLine label="Remaining" value={formatMoney(props.totals.remaining, props.settings.currency)} />
        {props.totals.change > 0 && <SummaryLine label="Change" value={formatMoney(props.totals.change, props.settings.currency)} strong />}
        <div className="payment-tabs">
          {(['Cash', 'Bank'] as PaymentMethod[]).map((method) => (
            <button className={props.paymentMethod === method ? 'active' : ''} key={method} onClick={() => props.setPaymentMethod(method)}>
              {method}
            </button>
          ))}
        </div>
        <div className="bank-fields">
          {props.paymentMethod === 'Bank' && (
            <select value={props.bankName} onChange={(event) => props.setBankName(event.target.value)}>
              <option>Meezan</option>
              <option>JazzCash</option>
              <option>Easypaisa</option>
              <option>UBL</option>
              <option>Askari</option>
            </select>
          )}
          <input
            placeholder={props.paymentMethod === 'Bank' ? 'Transaction reference' : 'Cash reference / note'}
            value={props.reference}
            onChange={(event) => props.setReference(event.target.value)}
          />
        </div>
        <label className="payment-status-field">
          Payment Status
          <select value={props.paymentStatus} onChange={(event) => props.setPaymentStatus(event.target.value as PaymentStatus)}>
            <option>Paid</option>
            <option>Pending</option>
          </select>
        </label>
        <div className="summary-actions">
          <button className="primary-btn" onClick={() => props.saveSale(true)}>
            <Printer size={17} /> Save & Print
          </button>
          <button onClick={() => props.saveSale(false)}>
            <Save size={17} /> Save Bill
          </button>
          <button onClick={props.preview}>
            <Eye size={17} /> Preview Invoice
          </button>
          <button onClick={() => props.saveSale(true)}>
            <Printer size={17} /> Print Invoice
          </button>
          <button className="danger-btn" onClick={props.clear}>
            <X size={17} /> Clear Bill
          </button>
        </div>
      </aside>
    </div>
  )
}

function DTGBilling(props: {
  invoiceNumber: string
  settings: CompanySettings
  items: CartItem[]
  customerName: string
  setCustomerName: (value: string) => void
  customerPhone: string
  setCustomerPhone: (value: string) => void
  vehicleNumber: string
  setVehicleNumber: (value: string) => void
  remarks: string
  setRemarks: (value: string) => void
  addItem: () => void
  updateItem: (id: string, changes: Partial<CartItem>) => void
  removeItem: (id: string) => void
  totals: {
    totalQty: number
    totalArea: number
    subtotal: number
    grandTotal: number
    remaining: number
    change: number
  }
  received: string
  setReceived: (value: string) => void
  paymentMethod: PaymentMethod
  setPaymentMethod: (value: PaymentMethod) => void
  paymentStatus: PaymentStatus
  setPaymentStatus: (value: PaymentStatus) => void
  bankName: string
  setBankName: (value: string) => void
  reference: string
  setReference: (value: string) => void
  saveSale: (print?: boolean) => void
  preview: () => void
  clear: () => void
  userName: string
}) {
  return (
    <div className="pos-layout dtg-billing">
      <section className="pos-main">
        <section className="dtg-customer-section">
          <div className="dtg-customer-heading">
            <Users size={18} />
            <div>
              <strong>Customer Details</strong>
              <span>{props.invoiceNumber}</span>
            </div>
          </div>
          <div className="customer-strip dtg-customer-strip">
            <label>
              Customer Name
              <input placeholder="Customer name" value={props.customerName} onChange={(event) => props.setCustomerName(event.target.value)} />
            </label>
            <label>
              Customer Phone
              <input
                type="tel"
                inputMode="numeric"
                maxLength={11}
                placeholder="11-digit phone number"
                value={props.customerPhone}
                onChange={(event) => props.setCustomerPhone(event.target.value.replace(/\D/g, '').slice(0, 11))}
              />
            </label>
            <label>
              Vehicle Number *
              <input
                placeholder="Required for printing"
                maxLength={20}
                required
                value={props.vehicleNumber}
                onChange={(event) => props.setVehicleNumber(event.target.value.toUpperCase())}
              />
            </label>
            <label>
              Invoice Number
              <input value={props.invoiceNumber} readOnly />
            </label>
            <label>
              Salesperson
              <input value={props.userName} readOnly />
            </label>
          </div>
        </section>
        <div className="dtf-entry-toolbar">
          <div>
            <strong>DTG Printing Items</strong>
            <span>Total amount = width x height x rate x pieces.</span>
          </div>
          <button className="primary-btn" type="button" onClick={props.addItem}>
            <Plus size={17} /> Add Printing Item
          </button>
        </div>
        <div className="table-wrap billing-table dtf-table">
          <table>
            <thead>
              <tr>
                 <th>No.</th>
                 <th>Item Name</th>
                 <th>Width (in)</th>
                 <th>Height (in)</th>
                 <th>Print Area</th>
                 <th>Rate / sq in</th>
                 <th>Amount / Piece</th>
                 <th>Pieces</th>
                 <th>Total Amount</th>
                 <th className="screen-only">Action</th>
              </tr>
            </thead>
            <tbody>
               {props.items.length === 0 && (
                 <tr>
                   <td colSpan={10} className="empty-cell">
                     Add a DTG printing item to begin billing.
                   </td>
                </tr>
              )}
              {props.items.map((item, index) => (
                <tr key={item.productId}>
                  <td data-label="No.">{index + 1}</td>
                   <td data-label="Item Name">
                    <input
                      value={item.description}
                      placeholder="Write item name"
                      onChange={(event) => props.updateItem(item.productId, { description: event.target.value })}
                    />
                   </td>
                   <td data-label="Width (in)">
                     <input
                       type="number"
                       min={0}
                       step="0.01"
                       placeholder="Width"
                       value={item.width || ''}
                       onChange={(event) => props.updateItem(item.productId, { width: Math.max(0, Number(event.target.value)) })}
                     />
                   </td>
                   <td data-label="Height (in)">
                     <input
                       type="number"
                       min={0}
                       step="0.01"
                       placeholder="Height"
                       value={item.height || ''}
                       onChange={(event) => props.updateItem(item.productId, { height: Math.max(0, Number(event.target.value)) })}
                     />
                   </td>
                   <td data-label="Print Area">{printAreaOf(item).toLocaleString()} sq in</td>
                   <td data-label="Rate / sq in">
                     <input
                       type="number"
                       min={0}
                       step="0.01"
                       placeholder="Rate / sq in"
                       value={item.rate || ''}
                       onChange={(event) => props.updateItem(item.productId, { rate: Math.max(0, Number(event.target.value)) })}
                     />
                   </td>
                   <td data-label="Amount / Piece">{formatMoney(amountPerPieceOf(item), props.settings.currency)}</td>
                   <td data-label="Pieces">
                     <QuantityInput value={item.qty} onChange={(value) => props.updateItem(item.productId, { qty: value })} />
                   </td>
                   <td data-label="Total Amount">{formatMoney(amountOf(item), props.settings.currency)}</td>
                   <td className="screen-only" data-label="Action">
                      <button className="icon-btn danger" type="button" onClick={() => props.removeItem(item.productId)} aria-label="Delete DTG item">
                       <Trash2 size={17} />
                    </button>
                  </td>
                </tr>
              ))}
           </tbody>
         </table>
       </div>
        <div className="dtf-remarks-row">
          <label>
            Remarks
            <textarea
              rows={2}
              placeholder="Special instructions or bill notes"
              value={props.remarks}
              onChange={(event) => props.setRemarks(event.target.value)}
            />
          </label>
        </div>
      </section>

      <aside className="bill-summary">
        <h3>DTG Bill Summary</h3>
        <SummaryLine label="Total Pieces" value={`${props.totals.totalQty}`} />
        <SummaryLine label="Total Print Area" value={`${props.totals.totalArea.toLocaleString()} sq in`} />
        <SummaryLine label="Total Amount" value={formatMoney(props.totals.subtotal, props.settings.currency)} />
        <SummaryLine label="Grand Total" value={formatMoney(props.totals.grandTotal, props.settings.currency)} strong />
        <label>
          Received Amount
            <input
              type="number"
              min={0}
              placeholder="Enter received amount"
              value={props.received}
              onChange={(event) => props.setReceived(sanitizeAmountInput(event.target.value))}
            />
        </label>
        <SummaryLine label="Remaining" value={formatMoney(props.totals.remaining, props.settings.currency)} />
        {props.totals.change > 0 && <SummaryLine label="Change" value={formatMoney(props.totals.change, props.settings.currency)} strong />}
        <div className="payment-tabs">
          {(['Cash', 'Bank'] as PaymentMethod[]).map((method) => (
            <button className={props.paymentMethod === method ? 'active' : ''} key={method} onClick={() => props.setPaymentMethod(method)}>
              {method}
            </button>
          ))}
        </div>
        <div className="bank-fields">
          {props.paymentMethod === 'Bank' && (
            <select value={props.bankName} onChange={(event) => props.setBankName(event.target.value)}>
              <option>Meezan</option>
              <option>JazzCash</option>
              <option>Easypaisa</option>
              <option>UBL</option>
              <option>Askari</option>
            </select>
          )}
          <input
            placeholder={props.paymentMethod === 'Bank' ? 'Transaction reference' : 'Cash reference / note'}
            value={props.reference}
            onChange={(event) => props.setReference(event.target.value)}
          />
        </div>
        <label className="payment-status-field">
          Payment Status
          <select value={props.paymentStatus} onChange={(event) => props.setPaymentStatus(event.target.value as PaymentStatus)}>
            <option>Paid</option>
            <option>Pending</option>
          </select>
        </label>
        <div className="summary-actions">
          <button className="primary-btn" onClick={() => props.saveSale(true)}>
            <Printer size={17} /> Save & Print
          </button>
          <button onClick={() => props.saveSale(false)}>
            <Save size={17} /> Save DTG Bill
          </button>
          <button onClick={props.preview}>
            <Eye size={17} /> Preview Invoice
          </button>
          <button onClick={() => props.saveSale(true)}>
            <Printer size={17} /> Print Invoice
          </button>
          <button className="danger-btn" onClick={props.clear}>
            <X size={17} /> Clear Bill
          </button>
        </div>
      </aside>
    </div>
  )
}

function SummaryLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? 'summary-line strong' : 'summary-line'}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}

function QuantityInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft}
      placeholder="Qty"
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => {
        const next = event.target.value.replace(/\D/g, '')
        setDraft(next)
        if (next) onChange(Math.max(1, Number(next)))
      }}
      onBlur={() => {
        if (!draft) {
          setDraft('1')
          onChange(1)
        }
      }}
    />
  )
}

function Inventory(props: {
  products: Product[]
  search: string
  setSearch: (value: string) => void
  addProduct: (event: React.FormEvent<HTMLFormElement>) => void
  draft: { description: string; article: string; category: string; rate: number; stock: number; image: string }
  setDraft: React.Dispatch<React.SetStateAction<{ description: string; article: string; category: string; rate: number; stock: number; image: string }>>
  editingProductId: string | null
  editProduct: (product: Product) => void
  cancelEdit: () => void
  deleteProduct: (id: string) => void
  exportInventory: () => void
  currency: string
  role: Role
}) {
  return (
    <div className="two-column">
      <section className="panel">
        <h3>{props.editingProductId ? 'Edit Product' : 'Add Product'}</h3>
        <form className="stack-form" onSubmit={props.addProduct}>
          <input placeholder="Description / Product Name" value={props.draft.description} onChange={(e) => props.setDraft((d) => ({ ...d, description: e.target.value }))} />
          <input placeholder="Article Number" value={props.draft.article} onChange={(e) => props.setDraft((d) => ({ ...d, article: e.target.value }))} />
          <select value={props.draft.category} onChange={(e) => props.setDraft((d) => ({ ...d, category: e.target.value }))}>
            {['T-Shirts', 'Polo Shirts', 'Hoodies', 'Sweatshirts', 'Trousers', 'Fabric', 'Accessories', 'Custom Products'].map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Sale rate in PKR"
            value={props.draft.rate || ''}
            onChange={(e) => props.setDraft((d) => ({ ...d, rate: Number(e.target.value) }))}
          />
          <input
            type="number"
            placeholder="Quantity in stock"
            value={props.draft.stock || ''}
            onChange={(e) => props.setDraft((d) => ({ ...d, stock: Number(e.target.value) }))}
          />
          <label className="image-field">
            <span>Product Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                  if (typeof reader.result === 'string') props.setDraft((draft) => ({ ...draft, image: reader.result as string }))
                }
                reader.readAsDataURL(file)
              }}
            />
          </label>
          {props.draft.image && (
            <div className="image-preview-row">
              <img className="product-image-preview" src={props.draft.image} alt="Product preview" />
              <button type="button" className="ghost-btn" onClick={() => props.setDraft((draft) => ({ ...draft, image: '' }))}>
                Remove image
              </button>
            </div>
          )}
          <button className="primary-btn">
            {props.editingProductId ? <Pencil size={17} /> : <PackagePlus size={17} />}
            {props.editingProductId ? 'Update Product' : 'Add Product'}
          </button>
          {props.editingProductId && (
            <button type="button" className="ghost-btn" onClick={props.cancelEdit}>
              <X size={17} /> Cancel Edit
            </button>
          )}
        </form>
      </section>
      <section className="panel wide inventory-panel">
        <div className="panel-title">
          <h3>Inventory</h3>
          <button className="primary-btn export-btn" onClick={props.exportInventory}>
            <Download size={16} /> Export Excel
          </button>
          <input value={props.search} onChange={(e) => props.setSearch(e.target.value)} placeholder="Search or filter inventory" />
        </div>
        <DataTable
          className="inventory-table"
          headers={['Product ID', 'Description', 'Article', 'Category', 'Rate', 'Stock', 'Status', 'Actions']}
          rows={props.products.map((product) => [
            product.id,
            <span className="inventory-product-cell">
              {product.image ? <img className="product-thumb" src={product.image} alt="" /> : <span className="product-thumb-placeholder">No image</span>}
              <span>{product.description}</span>
            </span>,
            product.article,
            product.category,
            formatMoney(product.rate, props.currency),
            `${product.stock}`,
            <span className={product.stock === 0 ? 'badge danger' : product.stock <= product.minStock ? 'badge warn' : 'badge ok'}>
              {product.stock === 0 ? 'Out of Stock' : product.stock <= product.minStock ? 'Low Stock' : 'In Stock'}
            </span>,
            <span className="action-cluster">
              <button className="icon-btn" title="Edit product" onClick={() => props.editProduct(product)}>
                <Pencil size={16} />
              </button>
              <button className="icon-btn danger" title="Delete product" onClick={() => props.deleteProduct(product.id)}>
                <Trash2 size={16} />
              </button>
            </span>,
          ])}
        />
      </section>
    </div>
  )
}

function BillingTypeSummary({
  sales,
  currency,
  billingTypes = ['POS', 'DTG'],
}: {
  sales: Sale[]
  currency: string
  billingTypes?: Array<'POS' | 'DTG'>
}) {
  const types = [
    { type: 'POS' as const, label: 'POS Billing', detail: 'Product sales', Icon: ShoppingCart },
    { type: 'DTG' as const, label: 'DTG Billing', detail: 'Direct-to-garment printing', Icon: ReceiptText },
  ].filter(({ type }) => billingTypes.includes(type))
  return (
    <div className="billing-type-summary">
      {types.map(({ type, label, detail, Icon }) => {
        const typeSales = sales.filter((sale) => billingTypeOf(sale) === type)
        const total = typeSales.reduce((sum, sale) => sum + sale.total, 0)
        return (
          <article className={`billing-type-card ${type.toLowerCase()}`} key={type}>
            <div className="billing-type-card-icon"><Icon size={17} /></div>
            <div>
              <strong>{label}</strong>
              <span>{detail}</span>
            </div>
            <b>{typeSales.length}</b>
            <small>{formatMoney(total, currency)}</small>
          </article>
        )
      })}
    </div>
  )
}

function SalesPage(props: {
  sales: Sale[]
  billingTypes: Array<'POS' | 'DTG'>
  search: string
  setSearch: (value: string) => void
  preview: (sale: Sale) => void
  print: (sale: Sale) => void
  products: Product[]
  editSale: (sale: Sale) => void
  exportSales: () => void
  currency: string
  role: Role
  deleteSale: (invoice: string) => void
}) {
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  return (
    <>
      <section className="panel">
        <div className="panel-title">
          <h3>Sales History</h3>
          <button className="primary-btn export-btn" onClick={props.exportSales}>
            <Download size={16} /> Export Excel
          </button>
          <input value={props.search} onChange={(e) => props.setSearch(e.target.value)} placeholder="Invoice, customer, or phone" />
        </div>
        <BillingTypeSummary sales={props.sales} currency={props.currency} billingTypes={props.billingTypes} />
        <div className="filter-row">
          {['Today', 'Yesterday', 'This Week', 'This Month', 'Custom Date Range', 'Cash', 'Bank'].map((filter) => (
            <button key={filter}>{filter}</button>
          ))}
        </div>
        <DataTable
          headers={['Invoice Number', 'Billing Type', 'Date', 'Time', 'Customer', 'Phone', 'Total Quantity', 'Grand Total', 'Paid Amount', 'Remaining Amount', 'Payment Method', 'Processed By', 'Actions']}
          rows={props.sales.map((sale) => [
            sale.invoice,
            <span className={`billing-tag ${billingTypeOf(sale).toLowerCase()}`}>{billingTypeOf(sale) === 'DTG' ? 'DTG Billing' : 'POS Billing'}</span>,
            sale.date,
            sale.time,
            sale.customer,
            sale.phone,
            sale.items.reduce((sum, item) => sum + item.qty, 0),
            formatMoney(sale.total, props.currency),
            formatMoney(sale.received, props.currency),
            formatMoney(sale.remaining, props.currency),
            sale.method,
            sale.cashier,
            <span className="action-cluster">
              <button onClick={() => setEditingSale(sale)}><Pencil size={14} /> Edit</button>
              <button onClick={() => props.preview(sale)}>View</button>
              <button onClick={() => props.print(sale)}>Print</button>
              <button className="danger-text" onClick={() => props.deleteSale(sale.invoice)}>
                Delete
              </button>
            </span>,
          ])}
        />
      </section>
      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          products={props.products}
          currency={props.currency}
          onClose={() => setEditingSale(null)}
          onSave={(sale) => {
            props.editSale(sale)
            setEditingSale(null)
          }}
        />
      )}
    </>
  )
}

function CustomersPage({
  sales,
  billingTypes,
  currency,
}: {
  sales: Sale[]
  billingTypes: CustomerBillingCategory[]
  currency: string
}) {
  const [category, setCategory] = useState<CustomerBillingCategory>(
    billingTypes.includes('POS') ? 'POS' : 'DTG',
  )
  const [selectedPhone, setSelectedPhone] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | PaymentStatus>('All')
  const profiles = customerProfilesFor(sales, category)
  const categorySales = sales.filter((sale) => billingTypeOf(sale) === category)
  const categoryTotals = profiles.reduce(
    (totals, profile) => ({
      billed: totals.billed + profile.billed,
      received: totals.received + profile.received,
      remaining: totals.remaining + profile.remaining,
    }),
    { billed: 0, received: 0, remaining: 0 },
  )
  const visibleProfiles = profiles.filter((profile) => {
    const query = search.trim().toLowerCase()
    const searchMatches = !query || `${profile.name} ${profile.phone}`.toLowerCase().includes(query)
    const statusMatches = statusFilter === 'All'
      || (statusFilter === 'Paid' ? profile.pendingBills === 0 : profile.pendingBills > 0)
    return searchMatches && statusMatches
  })
  const activeCustomer = visibleProfiles.find((profile) => profile.phone === selectedPhone)
    ?? visibleProfiles[0]
  const fullCustomerLedger = activeCustomer
    ? categorySales.filter((sale) => sale.phone === activeCustomer.phone)
    : []
  const visibleCustomerLedger = fullCustomerLedger.filter((sale) => (
    statusFilter === 'All' || paymentStateOf(sale) === statusFilter
  ))
  const ledgerTotals = fullCustomerLedger.reduce(
    (totals, sale) => ({
      quantity: totals.quantity + sale.items.reduce((sum, item) => sum + item.qty, 0),
      billed: totals.billed + sale.total,
      received: totals.received + sale.received,
      remaining: totals.remaining + sale.remaining,
      paidBills: totals.paidBills + (paymentStateOf(sale) === 'Paid' ? 1 : 0),
      pendingBills: totals.pendingBills + (paymentStateOf(sale) === 'Pending' ? 1 : 0),
    }),
    { quantity: 0, billed: 0, received: 0, remaining: 0, paidBills: 0, pendingBills: 0 },
  )
  const ledgerRows = visibleCustomerLedger.map((sale) => {
    const paymentState = paymentStateOf(sale)
    return [
      sale.invoice,
      <span className={`billing-tag ${category.toLowerCase()}`} key={`category-${sale.invoice}`}>
        {category} Billing
      </span>,
      sale.date,
      sale.time,
      sale.items.map((item) => item.description).join(', '),
      sale.items.reduce((sum, item) => sum + item.qty, 0),
      formatMoney(sale.total, currency),
      formatMoney(sale.received, currency),
      formatMoney(sale.remaining, currency),
      sale.method === 'Bank' ? `${sale.method} / ${sale.bankName || '-'}` : sale.method,
      <span className={paymentState === 'Paid' ? 'badge ok' : 'badge danger'} key={`status-${sale.invoice}`}>
        {paymentState}
      </span>,
      sale.vehicleNumber || '-',
    ]
  })

  const exportCustomerLedger = () => {
    if (!activeCustomer) return
    exportFormattedExcel(
      `afg-${category.toLowerCase()}-customer-ledger-${activeCustomer.name.toLowerCase().replaceAll(' ', '-')}`,
      `AFG | ${category} Customer Ledger`,
      `${activeCustomer.name} (${activeCustomer.phone}) | ${fullCustomerLedger.length} bill${fullCustomerLedger.length === 1 ? '' : 's'} | Billed: ${formatMoney(ledgerTotals.billed, currency)} | Received: ${formatMoney(ledgerTotals.received, currency)} | Pending: ${formatMoney(ledgerTotals.remaining, currency)}`,
      [
        {
          title: `${activeCustomer.name} - ${category} Billing`,
          headers: ['Invoice', 'Category', 'Date', 'Time', 'Items', 'Qty.', 'Billed', 'Received', 'Pending', 'Payment', 'Status', 'Vehicle'],
          rows: [
            ...fullCustomerLedger.map((sale) => [
              sale.invoice,
              `${category} Billing`,
              sale.date,
              sale.time,
              sale.items.map((item) => item.description).join(', '),
              sale.items.reduce((sum, item) => sum + item.qty, 0),
              formatMoney(sale.total, currency),
              formatMoney(sale.received, currency),
              formatMoney(sale.remaining, currency),
              sale.method === 'Bank' ? `${sale.method} / ${sale.bankName || '-'}` : sale.method,
              paymentStateOf(sale),
              sale.vehicleNumber || '-',
            ]),
            ['', '', '', '', 'TOTAL', ledgerTotals.quantity, formatMoney(ledgerTotals.billed, currency), formatMoney(ledgerTotals.received, currency), formatMoney(ledgerTotals.remaining, currency), '', '', ''],
          ],
          rightAlignedColumns: [5, 6, 7, 8],
          centerAlignedColumns: [0, 1, 2, 3, 9, 10, 11],
          highlightLastRow: true,
        },
      ],
    )
  }

  return (
    <div className="customers-page">
      <section className="panel customer-category-panel">
        <div className="customer-category-heading">
          <div>
            <h3>Customer Billing Directory</h3>
            <p className="report-subtitle">Select a billing category, then choose a customer to open the complete sales ledger.</p>
          </div>
          <div className="customer-category-tabs" aria-label="Customer billing category">
            {billingTypes.includes('POS') && (
              <button
                className={category === 'POS' ? 'pos active' : 'pos'}
                type="button"
                onClick={() => {
                  setCategory('POS')
                  setSelectedPhone('')
                  setStatusFilter('All')
                }}
              >
                <ShoppingCart size={17} /> POS Customers
              </button>
            )}
            {billingTypes.includes('DTG') && (
              <button
                className={category === 'DTG' ? 'dtg active' : 'dtg'}
                type="button"
                onClick={() => {
                  setCategory('DTG')
                  setSelectedPhone('')
                  setStatusFilter('All')
                }}
              >
                <ReceiptText size={17} /> DTG Customers
              </button>
            )}
          </div>
        </div>
        <div className="customer-category-summary">
          <div>
            <span>Customers</span>
            <strong>{profiles.length}</strong>
            <small>{category} category</small>
          </div>
          <div>
            <span>Total Bills</span>
            <strong>{categorySales.length}</strong>
            <small>all invoices</small>
          </div>
          <div>
            <span>Total Billed</span>
            <strong>{formatMoney(categoryTotals.billed, currency)}</strong>
            <small>sales value</small>
          </div>
          <div>
            <span>Received</span>
            <strong>{formatMoney(categoryTotals.received, currency)}</strong>
            <small>collected</small>
          </div>
          <div className="pending">
            <span>Pending</span>
            <strong>{formatMoney(categoryTotals.remaining, currency)}</strong>
            <small>outstanding</small>
          </div>
        </div>
      </section>

      <section className="panel customer-directory-panel">
        <div className="panel-title customer-directory-title">
          <div>
            <h3>{category} Customers</h3>
            <p className="report-subtitle">{visibleProfiles.length} customer{visibleProfiles.length === 1 ? '' : 's'} shown</p>
          </div>
          <span className={`billing-tag ${category.toLowerCase()}`}>{category}</span>
        </div>
        <label className="customer-directory-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or phone"
          />
        </label>
        <div className="customer-payment-filters" aria-label="Customer payment status">
          {(['All', 'Paid', 'Pending'] as const).map((status) => (
            <button
              className={statusFilter === status ? 'active' : ''}
              type="button"
              key={status}
              onClick={() => {
                setStatusFilter(status)
                setSelectedPhone('')
              }}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="customer-directory-list">
          {visibleProfiles.length ? visibleProfiles.map((profile) => (
            <button
              className={activeCustomer?.phone === profile.phone ? 'customer-directory-item active' : 'customer-directory-item'}
              type="button"
              key={profile.phone}
              onClick={() => setSelectedPhone(profile.phone)}
            >
              <span className="customer-avatar">{profile.name.trim().charAt(0).toUpperCase() || 'C'}</span>
              <span className="customer-directory-copy">
                <strong>{profile.name}</strong>
                <small>{profile.phone}</small>
                <small>{profile.invoices} bill{profile.invoices === 1 ? '' : 's'} - {profile.paidBills} paid - {profile.pendingBills} pending</small>
              </span>
              <span className="customer-directory-balance">
                <b>{formatMoney(profile.remaining, currency)}</b>
                <small className={profile.pendingBills ? 'pending' : 'paid'}>
                  {profile.pendingBills ? 'Pending' : 'Paid'}
                </small>
              </span>
            </button>
          )) : (
            <div className="customer-directory-empty">
              <Users size={24} />
              <strong>No {category} customers found</strong>
              <span>Try another payment filter or billing category.</span>
            </div>
          )}
        </div>
      </section>

      <section className="panel customer-profile-ledger">
        <div className="panel-title customer-ledger-heading">
          <div>
            <h3>{activeCustomer ? `${activeCustomer.name} Ledger` : 'Customer Ledger'}</h3>
            <p className="report-subtitle">
              {activeCustomer ? `${activeCustomer.phone} - ${category} billing category` : `Select a ${category} customer to view billing history.`}
            </p>
          </div>
          <button className="primary-btn export-btn" type="button" onClick={exportCustomerLedger} disabled={!activeCustomer}>
            <Download size={16} /> Export Full Ledger
          </button>
        </div>
        <div className="customer-profile-summary">
          <div>
            <span>Total Bills</span>
            <strong>{fullCustomerLedger.length}</strong>
          </div>
          <div>
            <span>Paid Bills</span>
            <strong>{ledgerTotals.paidBills}</strong>
          </div>
          <div className="pending">
            <span>Pending Bills</span>
            <strong>{ledgerTotals.pendingBills}</strong>
          </div>
          <div>
            <span>Total Billed</span>
            <strong>{formatMoney(ledgerTotals.billed, currency)}</strong>
          </div>
          <div>
            <span>Received</span>
            <strong>{formatMoney(ledgerTotals.received, currency)}</strong>
          </div>
          <div className="pending">
            <span>Pending Balance</span>
            <strong>{formatMoney(ledgerTotals.remaining, currency)}</strong>
          </div>
        </div>
        {statusFilter !== 'All' && (
          <p className="customer-ledger-filter-note">
            Showing {statusFilter.toLowerCase()} invoices. Select All to view the complete ledger.
          </p>
        )}
        <DataTable
          className="customer-profile-ledger-table"
          headers={['Invoice', 'Category', 'Date', 'Time', 'Items', 'Qty.', 'Billed', 'Received', 'Pending', 'Payment', 'Status', 'Vehicle']}
          rows={ledgerRows}
        />
      </section>
    </div>
  )
}

function EditSaleModal({
  sale,
  products,
  currency,
  onClose,
  onSave,
}: {
  sale: Sale
  products: Product[]
  currency: string
  onClose: () => void
  onSave: (sale: Sale) => void
}) {
  const [draft, setDraft] = useState<Sale>(() => ({
    ...sale,
    items: sale.items.map((item) => ({ ...item })),
  }))
  const [error, setError] = useState('')
  const isDtg = billingTypeOf(sale) === 'DTG'
  const subtotal = draft.items.reduce((sum, item) => sum + amountOf(item), 0)
  const total = subtotal
  const received = Math.max(0, Number(draft.received) || 0)
  const remaining = Math.max(0, total - received)
  const change = Math.max(0, received - total)

  const updateItem = (productId: string, changes: Partial<CartItem>) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (
        item.productId === productId ? { ...item, ...changes } : item
      )),
    }))
  }

  const saveChanges = () => {
    const phoneDigits = draft.phone.replace(/\D/g, '')
    if (!draft.customer.trim()) {
      setError('Customer name is required.')
      return
    }
    if (phoneDigits.length !== 11) {
      setError('Customer phone must contain exactly 11 digits.')
      return
    }
    if (!draft.vehicleNumber?.trim()) {
      setError('Vehicle number is required.')
      return
    }
    if (!draft.items.length) {
      setError('The bill must contain at least one item.')
      return
    }
    if (draft.items.some((item) => (
      !item.description.trim()
      || item.qty < 1
      || (isDtg ? item.rate <= 0 : item.rate < 0)
      || (isDtg && (Number(item.width) <= 0 || Number(item.height) <= 0))
    ))) {
      setError(isDtg
        ? 'Complete every DTG item with a name, width, height, pieces, and rate.'
        : 'Complete every item with a valid name, quantity, and rate.')
      return
    }
    if (!isDtg) {
      const unavailableItem = draft.items.find((item) => {
        const product = products.find((row) => row.id === item.productId)
        const originalQty = sale.items.find((row) => row.productId === item.productId)?.qty ?? 0
        return product ? item.qty > product.stock + originalQty : false
      })
      if (unavailableItem) {
        setError(`Not enough stock is available for ${unavailableItem.description}.`)
        return
      }
    }
    onSave({
      ...draft,
      customer: draft.customer.trim(),
      phone: draft.phone.trim(),
      vehicleNumber: draft.vehicleNumber.trim(),
      items: draft.items.map((item) => ({
        ...item,
        description: item.description.trim(),
        position: undefined,
        width: isDtg ? Math.max(0, Number(item.width) || 0) : undefined,
        height: isDtg ? Math.max(0, Number(item.height) || 0) : undefined,
        qty: Math.max(1, Math.floor(item.qty)),
        rate: Math.max(0, item.rate),
      })),
      subtotal,
      pretreatmentCharge: 0,
      discount: 0,
      total,
      received,
      remaining,
      change,
      bankName: draft.method === 'Bank' ? draft.bankName || 'Meezan' : undefined,
      reference: draft.reference?.trim() || undefined,
      remarks: draft.remarks?.trim() || undefined,
    })
  }

  return (
    <div className="modal-backdrop">
      <section className="sale-edit-modal" aria-label={`Edit ${sale.invoice}`}>
        <div className="sale-edit-header">
          <div>
            <span className={`billing-tag ${isDtg ? 'dtg' : 'pos'}`}>{isDtg ? 'DTG Billing' : 'POS Billing'}</span>
            <h3>Edit Bill {sale.invoice}</h3>
            <p>{sale.date} · {sale.time} · Processed by {sale.cashier}</p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close bill editor" title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="sale-edit-fields">
          <label>
            Customer Name
            <input value={draft.customer} onChange={(event) => setDraft((current) => ({ ...current, customer: event.target.value }))} />
          </label>
          <label>
            Customer Phone
            <input inputMode="numeric" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} />
          </label>
          <label>
            Vehicle Number
            <input value={draft.vehicleNumber || ''} onChange={(event) => setDraft((current) => ({ ...current, vehicleNumber: event.target.value }))} />
          </label>
          <label>
            Payment Method
            <select value={draft.method} onChange={(event) => setDraft((current) => ({ ...current, method: event.target.value as PaymentMethod }))}>
              <option>Cash</option>
              <option>Bank</option>
            </select>
          </label>
          {draft.method === 'Bank' && (
            <label>
              Bank
              <select value={draft.bankName || 'Meezan'} onChange={(event) => setDraft((current) => ({ ...current, bankName: event.target.value }))}>
                <option>Meezan</option>
                <option>JazzCash</option>
                <option>Easypaisa</option>
                <option>UBL</option>
                <option>Askari</option>
              </select>
            </label>
          )}
          <label>
            Payment Status
            <select value={draft.paymentStatus} onChange={(event) => setDraft((current) => ({ ...current, paymentStatus: event.target.value as PaymentStatus }))}>
              <option>Paid</option>
              <option>Pending</option>
            </select>
          </label>
          <label>
            Received Amount
            <input
              type="number"
              min="0"
              value={draft.received}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setDraft((current) => ({ ...current, received: Math.max(0, Number(event.target.value) || 0) }))}
            />
          </label>
          <label>
            Payment Reference
            <input value={draft.reference || ''} onChange={(event) => setDraft((current) => ({ ...current, reference: event.target.value }))} />
          </label>
        </div>

        <div className="sale-edit-items">
          <div className="panel-title">
            <div>
              <h3>Bill Items</h3>
              <p className="report-subtitle">{isDtg ? 'DTG totals use print area x your rate x pieces.' : 'Update quantities and rates. Stock is checked for POS items.'}</p>
            </div>
            {isDtg && (
              <button
                type="button"
                onClick={() => setDraft((current) => ({
                  ...current,
                  items: [
                    ...current.items,
                    {
                      productId: `DTG-EDIT-${Date.now()}`,
                      description: '',
                      article: 'DTG',
                      width: 0,
                      height: 0,
                      qty: 1,
                      rate: 0,
                    },
                  ],
                }))}
              >
                <Plus size={16} /> Add Item
              </button>
            )}
          </div>
          <div className="sale-edit-item-list">
            {draft.items.map((item, index) => (
              <div className={`sale-edit-item ${isDtg ? 'dtg' : ''}`} key={item.productId}>
                <span className="sale-edit-item-number">{index + 1}</span>
                <label>
                  Item
                  <input
                    value={item.description}
                    readOnly={!isDtg}
                    onChange={(event) => updateItem(item.productId, { description: event.target.value })}
                  />
                </label>
                {isDtg ? (
                  <>
                    <label>
                      Width (in)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.width || ''}
                        onChange={(event) => updateItem(item.productId, { width: Math.max(0, Number(event.target.value) || 0) })}
                      />
                    </label>
                    <label>
                      Height (in)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.height || ''}
                        onChange={(event) => updateItem(item.productId, { height: Math.max(0, Number(event.target.value) || 0) })}
                      />
                    </label>
                  </>
                ) : (
                  <label>
                    Article
                    <input value={item.article} readOnly />
                  </label>
                )}
                <label>
                  {isDtg ? 'Pieces' : 'Qty.'}
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => updateItem(item.productId, { qty: Math.max(1, Math.floor(Number(event.target.value) || 1)) })}
                  />
                </label>
                <label>
                  {isDtg ? 'Rate / sq in' : 'Rate'}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => updateItem(item.productId, { rate: Math.max(0, Number(event.target.value) || 0) })}
                  />
                </label>
                <strong title={isDtg ? `${printAreaOf(item).toLocaleString()} sq in at ${formatMoney(item.rate, currency)} per sq in; ${formatMoney(amountPerPieceOf(item), currency)} per piece` : undefined}>
                  {formatMoney(amountOf(item), currency)}
                </strong>
                {isDtg && (
                  <button
                    className="icon-btn danger-text"
                    type="button"
                    onClick={() => setDraft((current) => ({
                      ...current,
                      items: current.items.filter((row) => row.productId !== item.productId),
                    }))}
                    aria-label={`Remove ${item.description || `item ${index + 1}`}`}
                    title="Remove item"
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="sale-edit-footer">
          <label className="sale-edit-remarks">
            Remarks
            <textarea value={draft.remarks || ''} onChange={(event) => setDraft((current) => ({ ...current, remarks: event.target.value }))} />
          </label>
          <div className="sale-edit-totals">
            <SummaryLine label="Subtotal" value={formatMoney(subtotal, currency)} />
            <SummaryLine label="Grand Total" value={formatMoney(total, currency)} strong />
            <SummaryLine label="Received" value={formatMoney(received, currency)} />
            <SummaryLine label="Remaining" value={formatMoney(remaining, currency)} />
            {change > 0 && <SummaryLine label="Change" value={formatMoney(change, currency)} />}
          </div>
        </div>
        {error && <p className="form-error sale-edit-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary-btn" type="button" onClick={saveChanges}>
            <Save size={17} /> Save Changes
          </button>
        </div>
      </section>
    </div>
  )
}

const staffDepartments = ['Cutting', 'Stitching', 'Finishing', 'Quality Control', 'Packing', 'Printing', 'Administration']

function StaffPage({
  staff,
  setStaff,
  role,
  currency,
}: {
  staff: StaffMember[]
  setStaff: React.Dispatch<React.SetStateAction<StaffMember[]>>
  role: Role
  currency: string
}) {
  const [departmentFilter, setDepartmentFilter] = useState('All Departments')
  const [draft, setDraft] = useState({ name: '', phone: '', department: staffDepartments[0], designation: '', salaryAmount: '', salaryEnabled: true })
  const [timeAssignment, setTimeAssignment] = useState(() => {
    const member = staff.find((item) => item.status === 'Active')
    return {
      staffId: member?.id ?? '',
      shiftStart: member?.shiftStart ?? '09:00',
      shiftEnd: member?.shiftEnd ?? '17:00',
    }
  })
  const [timeAssignmentMessage, setTimeAssignmentMessage] = useState('')
  const canManage = role === 'Owner' || role === 'Admin'
  const filteredStaff = staff.filter((member) => departmentFilter === 'All Departments' || member.department === departmentFilter)
  const assignableStaff = staff.filter((member) => member.status === 'Active')

  const addStaff = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.name.trim() || !draft.designation.trim()) return
    const salaryAmount = Math.max(0, Number(draft.salaryAmount) || 0)
    setStaff((rows) => [
      {
        id: `ST-${String(rows.length + 1).padStart(3, '0')}`,
        name: draft.name.trim(),
        phone: draft.phone.trim() || '-',
        department: draft.department,
        designation: draft.designation.trim(),
        shiftStart: '09:00',
        shiftEnd: '17:00',
        salaryAmount,
        salaryEnabled: draft.salaryEnabled && salaryAmount > 0,
        salaryMode: 'Monthly',
        status: 'Active',
      },
      ...rows,
    ])
    setDraft({ name: '', phone: '', department: staffDepartments[0], designation: '', salaryAmount: '', salaryEnabled: true })
  }

  const selectStaffForTime = (staffId: string) => {
    const member = staff.find((item) => item.id === staffId)
    setTimeAssignment({
      staffId,
      shiftStart: member?.shiftStart ?? '09:00',
      shiftEnd: member?.shiftEnd ?? '17:00',
    })
    setTimeAssignmentMessage('')
  }

  const assignStaffTime = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canManage) return
    const member = staff.find((item) => item.id === timeAssignment.staffId)
    const startMinutes = attendanceMinutesOf(timeAssignment.shiftStart)
    const endMinutes = attendanceMinutesOf(timeAssignment.shiftEnd)
    if (!member || startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      setTimeAssignmentMessage('Choose a staff member and set an end time later than the start time.')
      return
    }
    setStaff((rows) => rows.map((item) => (
      item.id === member.id
        ? { ...item, shiftStart: timeAssignment.shiftStart, shiftEnd: timeAssignment.shiftEnd }
        : item
    )))
    setTimeAssignmentMessage(`${member.name}: ${formatAttendanceTime(timeAssignment.shiftStart)} to ${formatAttendanceTime(timeAssignment.shiftEnd)} assigned.`)
  }

  const toggleStaff = (id: string) => {
    if (!canManage) return
    setStaff((rows) => rows.map((member) => (member.id === id ? { ...member, status: member.status === 'Active' ? 'Inactive' : 'Active' } : member)))
  }

  const updateSalary = (id: string, salaryAmount: number) => {
    if (!canManage) return
    setStaff((rows) => rows.map((member) => (member.id === id ? { ...member, salaryAmount: Math.max(0, salaryAmount), salaryEnabled: salaryAmount > 0 ? member.salaryEnabled : false, salaryMode: 'Monthly' } : member)))
  }

  const toggleSalary = (id: string) => {
    if (!canManage) return
    setStaff((rows) => rows.map((member) => (member.id === id ? { ...member, salaryEnabled: !member.salaryEnabled && member.salaryAmount > 0, salaryMode: member.salaryMode ?? 'Monthly' } : member)))
  }

  const deleteStaff = (member: StaffMember) => {
    if (role !== 'Owner') return
    if (!window.confirm(`Delete ${member.name} from the staff directory?`)) return
    setStaff((rows) => rows.filter((row) => row.id !== member.id))
  }

  return (
    <div className="two-column staff-page">
      <section className="panel">
        <h3>Add Staff</h3>
        <p className="report-subtitle">Salary amounts use {currency} and can be added to the Salary tab.</p>
        {!canManage && <p className="permission-note">Staff changes are available to Owner and Admin.</p>}
        {canManage && role !== 'Owner' && <p className="permission-note">Only the Owner can delete staff.</p>}
        <form className="stack-form" onSubmit={addStaff}>
          <input placeholder="Staff name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} disabled={!canManage} />
          <input placeholder="Phone number" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} disabled={!canManage} />
          <select value={draft.department} onChange={(event) => setDraft((current) => ({ ...current, department: event.target.value }))} disabled={!canManage}>
            {staffDepartments.map((department) => <option key={department}>{department}</option>)}
          </select>
          <input placeholder="Designation / job title" value={draft.designation} onChange={(event) => setDraft((current) => ({ ...current, designation: event.target.value }))} disabled={!canManage} />
          <input
            inputMode="decimal"
            placeholder="Monthly salary amount"
            value={draft.salaryAmount}
            onChange={(event) => setDraft((current) => ({ ...current, salaryAmount: sanitizeAmountInput(event.target.value) }))}
            disabled={!canManage}
          />
          <label className="check-row">
            <input
              type="checkbox"
              checked={draft.salaryEnabled}
              onChange={(event) => setDraft((current) => ({ ...current, salaryEnabled: event.target.checked }))}
              disabled={!canManage}
            />
            Add this person to Salary
          </label>
          <button className="primary-btn" disabled={!canManage}><UserPlus size={17} /> Add Staff</button>
        </form>
      </section>
      <section className="panel wide staff-list-panel">
        <div className="panel-title">
          <div>
            <h3>Staff Directory</h3>
            <p className="report-subtitle">{filteredStaff.length} staff member{filteredStaff.length === 1 ? '' : 's'} · department view</p>
          </div>
          <button className="ghost-btn export-btn" onClick={printStaffDirectory}>
            <Printer size={16} /> Print Staff
          </button>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
            <option>All Departments</option>
            {staffDepartments.map((department) => <option key={department}>{department}</option>)}
          </select>
        </div>
        <div className="staff-time-assignment">
          <div>
            <h4>Assign Staff Time</h4>
            <p className="report-subtitle">Set the daily shift used for late and early check-out detection.</p>
          </div>
          <form className="staff-time-assignment-form" onSubmit={assignStaffTime}>
            <label>
              Staff Member
              <select value={timeAssignment.staffId} onChange={(event) => selectStaffForTime(event.target.value)} disabled={!canManage || !assignableStaff.length}>
                {!assignableStaff.length && <option value="">No active staff</option>}
                {assignableStaff.map((member) => <option key={member.id} value={member.id}>{member.name} - {member.department}</option>)}
              </select>
            </label>
            <label>
              Start Time
              <input
                type="time"
                value={timeAssignment.shiftStart}
                onChange={(event) => setTimeAssignment((assignment) => ({ ...assignment, shiftStart: event.target.value }))}
                disabled={!canManage}
                required
              />
            </label>
            <label>
              End Time
              <input
                type="time"
                value={timeAssignment.shiftEnd}
                onChange={(event) => setTimeAssignment((assignment) => ({ ...assignment, shiftEnd: event.target.value }))}
                disabled={!canManage}
                required
              />
            </label>
            <button className="primary-btn" type="submit" disabled={!canManage || !assignableStaff.length}>
              <CalendarCheck size={17} /> Assign Time
            </button>
          </form>
          {timeAssignmentMessage && <p className="staff-time-assignment-message">{timeAssignmentMessage}</p>}
        </div>
        <DataTable
          className="staff-table"
          headers={['Staff ID', 'Name', 'Department', 'Designation', 'Assigned Time', 'Phone', 'Monthly Salary', 'Salary', 'Status', 'Actions']}
          rows={filteredStaff.map((member) => [
            member.id,
            member.name,
            member.department,
            member.designation,
            <span className="staff-shift" key={`staff-shift-${member.id}`}>
              <strong>{formatAttendanceTime(member.shiftStart)}</strong>
              <small>to {formatAttendanceTime(member.shiftEnd)}</small>
            </span>,
            member.phone,
            <input
              className="salary-amount-input"
              inputMode="decimal"
              aria-label={`Monthly salary for ${member.name}`}
              value={member.salaryAmount ? String(member.salaryAmount) : ''}
              placeholder="0"
              onChange={(event) => updateSalary(member.id, Number(sanitizeAmountInput(event.target.value)) || 0)}
              disabled={!canManage}
            />,
            <button className={member.salaryEnabled ? 'salary-toggle active' : 'salary-toggle'} disabled={!canManage || member.salaryAmount <= 0} onClick={() => toggleSalary(member.id)}>
              {member.salaryEnabled ? 'In Salary' : 'Add Salary'}
            </button>,
            <span className={member.status === 'Active' ? 'badge ok' : 'badge danger'}>{member.status}</span>,
            <span className="action-cluster">
              <button className={member.status === 'Active' ? 'danger-text' : ''} disabled={!canManage} onClick={() => toggleStaff(member.id)}>
                {member.status === 'Active' ? 'Deactivate' : 'Activate'}
              </button>
              {role === 'Owner' && (
                <button className="icon-btn danger" title="Delete staff" aria-label={`Delete ${member.name}`} onClick={() => deleteStaff(member)}>
                  <Trash2 size={16} />
                </button>
              )}
            </span>,
          ])}
        />
      </section>
    </div>
  )
}

function SalaryPage({
  staff,
  setStaff,
  attendance,
  pieceRateEntries,
  setPieceRateEntries,
  salaryAdvances,
  setSalaryAdvances,
  role,
  currency,
  notify,
  recordDeletion,
  userName,
}: {
  staff: StaffMember[]
  setStaff: React.Dispatch<React.SetStateAction<StaffMember[]>>
  attendance: AttendanceRecord[]
  pieceRateEntries: PieceRateEntry[]
  setPieceRateEntries: React.Dispatch<React.SetStateAction<PieceRateEntry[]>>
  salaryAdvances: SalaryAdvance[]
  setSalaryAdvances: React.Dispatch<React.SetStateAction<SalaryAdvance[]>>
  role: Role
  currency: string
  notify: (message: string) => void
  recordDeletion: (entity: string, detail: string) => void
  userName: string
}) {
  const [selectedMonth, setSelectedMonth] = useState(getTodayText().slice(0, 7))
  const [pieceRateDraft, setPieceRateDraft] = useState({
    staffId: '',
    date: getTodayText(),
    endDate: getTodayText(),
    item: '',
    pcs: '',
    rate: '',
  })
  const [advanceDraft, setAdvanceDraft] = useState({
    staffId: '',
    date: getTodayText(),
    amount: '',
    remarks: '',
  })
  const [monthlyAdvanceDraft, setMonthlyAdvanceDraft] = useState({
    staffId: '',
    date: getTodayText(),
    amount: '',
    remarks: '',
  })
  const [thekaView, setThekaView] = useState<'Work' | 'Advances'>('Work')
  const [editingAdvanceId, setEditingAdvanceId] = useState<string | null>(null)
  const [salaryAssignment, setSalaryAssignment] = useState<{ staffId: string; mode: SalaryMode }>({ staffId: '', mode: 'Monthly' })
  const canManage = role === 'Owner' || role === 'Admin'
  const monthDate = new Date(`${selectedMonth}-01T00:00:00`)
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
  const assignableStaff = staff.filter((member) => member.status === 'Active')
  const payrollStaff = staff.filter((member) => member.salaryEnabled && (member.salaryMode ?? 'Monthly') === 'Monthly')
  const pieceRateStaff = staff.filter((member) => member.status === 'Active' && member.salaryEnabled && member.salaryMode === 'Theka')
  const monthRecords = attendance.filter((record) => record.date.startsWith(selectedMonth))
  const monthStart = `${selectedMonth}-01`
  const monthEnd = `${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`
  const monthPieceRateEntries = pieceRateEntries.filter((entry) => {
    const entryStart = entry.date
    const entryEnd = entry.endDate || entry.date
    return entryStart <= monthEnd && entryEnd >= monthStart
  })
  const monthMonthlyAdvances = salaryAdvances.filter((advance) => advance.salaryType === 'Monthly' && advance.date >= monthStart && advance.date <= monthEnd)
  const monthPieceRateAdvances = salaryAdvances.filter((advance) => advance.salaryType === 'Theka' && advance.date >= monthStart && advance.date <= monthEnd)
  const editingAdvance = editingAdvanceId ? salaryAdvances.find((advance) => advance.id === editingAdvanceId) : undefined
  const editingMonthlyAdvance = editingAdvance?.salaryType === 'Monthly'
  const editingThekaAdvance = editingAdvance?.salaryType === 'Theka'
  const draftPcs = Math.max(0, Math.floor(Number(pieceRateDraft.pcs) || 0))
  const draftRate = Math.max(0, Number(pieceRateDraft.rate) || 0)
  const draftTotal = draftPcs * draftRate
  const draftAdvanceAmount = Math.max(0, Number(sanitizeAmountInput(advanceDraft.amount)) || 0)
  const monthlyDraftAdvanceAmount = Math.max(0, Number(sanitizeAmountInput(monthlyAdvanceDraft.amount)) || 0)

  useEffect(() => {
    if (!pieceRateDraft.staffId && pieceRateStaff.length) {
      setPieceRateDraft((draft) => ({ ...draft, staffId: pieceRateStaff[0].id }))
    }
  }, [pieceRateDraft.staffId, pieceRateStaff.length])

  useEffect(() => {
    if (!advanceDraft.staffId && pieceRateStaff.length) {
      setAdvanceDraft((draft) => ({ ...draft, staffId: pieceRateStaff[0].id }))
    }
  }, [advanceDraft.staffId, pieceRateStaff.length])

  useEffect(() => {
    if (!monthlyAdvanceDraft.staffId && payrollStaff.length) {
      setMonthlyAdvanceDraft((draft) => ({ ...draft, staffId: payrollStaff[0].id }))
    }
  }, [monthlyAdvanceDraft.staffId, payrollStaff.length])

  useEffect(() => {
    if (!salaryAssignment.staffId && assignableStaff.length) {
      setSalaryAssignment((assignment) => ({ ...assignment, staffId: assignableStaff[0].id }))
    }
  }, [salaryAssignment.staffId, assignableStaff.length])

  const salaryRows = payrollStaff.map((member) => {
    const memberRecords = monthRecords.filter((record) => record.staffId === member.id)
    const presentDays = memberRecords.filter((record) => record.status === 'Present').length
    const lateDays = memberRecords.filter((record) => record.status === 'Late').length
    const halfDays = memberRecords.filter((record) => record.status === 'Half Day').length
    const absentDays = Math.max(0, daysInMonth - presentDays - lateDays - halfDays)
    const payableDays = presentDays + lateDays + halfDays * 0.5
    const dailyRate = daysInMonth ? member.salaryAmount / daysInMonth : 0
    const calculatedSalary = Math.max(0, Math.round(dailyRate * payableDays))
    const advance = monthMonthlyAdvances.filter((item) => item.staffId === member.id).reduce((sum, item) => sum + item.amount, 0)
    return { member, presentDays, lateDays, halfDays, absentDays, payableDays, calculatedSalary, advance, netPayable: Math.max(0, calculatedSalary - advance) }
  })
  const monthlyPayroll = salaryRows.reduce((sum, row) => sum + row.member.salaryAmount, 0)
  const calculatedPayroll = salaryRows.reduce((sum, row) => sum + row.calculatedSalary, 0)
  const monthlyAdvanceTotal = salaryRows.reduce((sum, row) => sum + row.advance, 0)
  const monthlyNetPayroll = salaryRows.reduce((sum, row) => sum + row.netPayable, 0)
  const activeSalaryStaff = salaryRows.filter((row) => row.member.status === 'Active').length
  const pieceRateTotal = monthPieceRateEntries.reduce((sum, entry) => sum + entry.total, 0)
  const pieceRatePcs = monthPieceRateEntries.reduce((sum, entry) => sum + entry.pcs, 0)
  const pieceRateAdvanceTotal = monthPieceRateAdvances.reduce((sum, advance) => sum + advance.amount, 0)
  const pieceRateNetTotal = Math.max(0, pieceRateTotal - pieceRateAdvanceTotal)
  const pieceRateStaffTotals = pieceRateStaff.map((member) => {
    const entries = monthPieceRateEntries.filter((entry) => entry.staffId === member.id)
    const advances = monthPieceRateAdvances.filter((advance) => advance.staffId === member.id)
    const grossSalary = entries.reduce((sum, entry) => sum + entry.total, 0)
    const advance = advances.reduce((sum, item) => sum + item.amount, 0)
    return {
      member,
      itemCount: entries.length,
      pcs: entries.reduce((sum, entry) => sum + entry.pcs, 0),
      total: grossSalary,
      advance,
      netTotal: Math.max(0, grossSalary - advance),
    }
  })

  const updateSalary = (id: string, value: string) => {
    if (!canManage) return
    const salaryAmount = Math.max(0, Number(sanitizeAmountInput(value)) || 0)
    setStaff((rows) => rows.map((member) => (member.id === id ? { ...member, salaryAmount, salaryEnabled: salaryAmount > 0, salaryMode: 'Monthly' } : member)))
  }

  const removeFromSalary = (id: string) => {
    if (!canManage) return
    setStaff((rows) => rows.map((member) => (member.id === id ? { ...member, salaryEnabled: false } : member)))
  }

  const assignSalaryMode = () => {
    if (!canManage) return
    const member = assignableStaff.find((item) => item.id === salaryAssignment.staffId)
    if (!member) {
      notify('Select an active staff member first.')
      return
    }
    setStaff((rows) => rows.map((item) => (item.id === member.id ? { ...item, salaryEnabled: true, salaryMode: salaryAssignment.mode } : item)))
    notify(`${member.name} added to ${salaryAssignment.mode === 'Theka' ? 'Theka / Piece-Rate' : 'Monthly Salary'}.`)
  }

  const addPieceRateEntry = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canManage) return
    const member = pieceRateStaff.find((item) => item.id === pieceRateDraft.staffId)
    if (!member || !pieceRateDraft.item.trim() || draftPcs <= 0 || draftRate <= 0 || !pieceRateDraft.date || !pieceRateDraft.endDate || pieceRateDraft.endDate < pieceRateDraft.date) {
      notify('Select staff, enter a valid work date range, item name, PCS, and per-piece rate.')
      return
    }
    const entry: PieceRateEntry = {
      id: `PR-${Date.now()}`,
      date: pieceRateDraft.date,
      endDate: pieceRateDraft.endDate,
      staffId: member.id,
      employee: member.name,
      department: member.department,
      item: pieceRateDraft.item.trim(),
      pcs: draftPcs,
      rate: draftRate,
      total: draftTotal,
      addedBy: userName,
    }
    setPieceRateEntries((rows) => [entry, ...rows])
    setPieceRateDraft((draft) => ({ ...draft, item: '', pcs: '', rate: '' }))
    notify(`Piece-rate salary added: ${formatMoney(entry.total, currency)}.`)
  }

  const removePieceRateEntry = (id: string) => {
    if (!canManage) return
    const entry = pieceRateEntries.find((item) => item.id === id)
    if (!entry) return
    setPieceRateEntries((rows) => rows.filter((entry) => entry.id !== id))
    recordDeletion(
      'Piece-rate salary',
      `Entry: ${entry.id} | Work: ${entry.item} | Staff ID: ${entry.staffId} | Employee: ${entry.employee} | Department: ${entry.department} | Work range: ${entry.date} to ${entry.endDate || entry.date} | PCS: ${entry.pcs} | Per-piece rate: ${formatMoney(entry.rate, currency)} | Total amount: ${formatMoney(entry.total, currency)} | Added by: ${entry.addedBy}`,
    )
  }

  const addThekaAdvance = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canManage) return
    const member = pieceRateStaff.find((item) => item.id === advanceDraft.staffId)
    if (!member || !advanceDraft.date || draftAdvanceAmount <= 0) {
      notify('Select Theka staff and enter a valid advance amount.')
      return
    }
    const existingAdvance = editingAdvanceId ? salaryAdvances.find((item) => item.id === editingAdvanceId && item.salaryType === 'Theka') : undefined
    if (existingAdvance) {
      setSalaryAdvances((rows) => rows.map((item) => (item.id === existingAdvance.id ? { ...item, date: advanceDraft.date, staffId: member.id, employee: member.name, amount: draftAdvanceAmount, remarks: advanceDraft.remarks.trim() || 'Salary advance' } : item)))
      setAdvanceDraft((draft) => ({ ...draft, amount: '', remarks: '' }))
      setEditingAdvanceId(null)
      notify(`Theka advance updated: ${formatMoney(draftAdvanceAmount, currency)}.`)
      return
    }
    const advance: SalaryAdvance = {
      id: `ADV-${Date.now()}`,
      date: advanceDraft.date,
      staffId: member.id,
      employee: member.name,
      salaryType: 'Theka',
      amount: draftAdvanceAmount,
      remarks: advanceDraft.remarks.trim() || 'Salary advance',
      addedBy: userName,
    }
    setSalaryAdvances((rows) => [advance, ...rows])
    setAdvanceDraft((draft) => ({ ...draft, amount: '', remarks: '' }))
    notify(`Theka advance added: ${formatMoney(advance.amount, currency)}.`)
  }

  const addMonthlyAdvance = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canManage) return
    const member = payrollStaff.find((item) => item.id === monthlyAdvanceDraft.staffId)
    if (!member || !monthlyAdvanceDraft.date || monthlyDraftAdvanceAmount <= 0) {
      notify('Select Monthly Salary staff and enter a valid advance amount.')
      return
    }
    const existingAdvance = editingAdvanceId ? salaryAdvances.find((item) => item.id === editingAdvanceId && item.salaryType === 'Monthly') : undefined
    if (existingAdvance) {
      setSalaryAdvances((rows) => rows.map((item) => (item.id === existingAdvance.id ? { ...item, date: monthlyAdvanceDraft.date, staffId: member.id, employee: member.name, amount: monthlyDraftAdvanceAmount, remarks: monthlyAdvanceDraft.remarks.trim() || 'Salary advance' } : item)))
      setMonthlyAdvanceDraft((draft) => ({ ...draft, amount: '', remarks: '' }))
      setEditingAdvanceId(null)
      notify(`Monthly salary advance updated: ${formatMoney(monthlyDraftAdvanceAmount, currency)}.`)
      return
    }
    const advance: SalaryAdvance = {
      id: `ADV-${Date.now()}`,
      date: monthlyAdvanceDraft.date,
      staffId: member.id,
      employee: member.name,
      salaryType: 'Monthly',
      amount: monthlyDraftAdvanceAmount,
      remarks: monthlyAdvanceDraft.remarks.trim() || 'Salary advance',
      addedBy: userName,
    }
    setSalaryAdvances((rows) => [advance, ...rows])
    setMonthlyAdvanceDraft((draft) => ({ ...draft, amount: '', remarks: '' }))
    notify(`Monthly salary advance added: ${formatMoney(advance.amount, currency)}.`)
  }

  const editAdvance = (advance: SalaryAdvance) => {
    if (!canManage) return
    setEditingAdvanceId(advance.id)
    if (advance.salaryType === 'Theka') {
      setThekaView('Advances')
      setAdvanceDraft({ staffId: advance.staffId, date: advance.date, amount: String(advance.amount), remarks: advance.remarks })
    } else {
      setMonthlyAdvanceDraft({ staffId: advance.staffId, date: advance.date, amount: String(advance.amount), remarks: advance.remarks })
    }
  }

  const cancelAdvanceEdit = () => {
    setEditingAdvanceId(null)
    setAdvanceDraft((draft) => ({ ...draft, amount: '', remarks: '' }))
    setMonthlyAdvanceDraft((draft) => ({ ...draft, amount: '', remarks: '' }))
  }

  const removeThekaAdvance = (id: string) => {
    if (!canManage) return
    const advance = salaryAdvances.find((item) => item.id === id)
    if (!advance) return
    if (editingAdvanceId === id) cancelAdvanceEdit()
    setSalaryAdvances((rows) => rows.filter((item) => item.id !== id))
    recordDeletion(
      'Theka salary advance',
      `Advance: ${advance.id} | Staff ID: ${advance.staffId} | Employee: ${advance.employee} | Date: ${advance.date} | Amount: ${formatMoney(advance.amount, currency)} | Remarks: ${advance.remarks} | Added by: ${advance.addedBy}`,
    )
  }

  const removeMonthlyAdvance = (id: string) => {
    if (!canManage) return
    const advance = salaryAdvances.find((item) => item.id === id)
    if (!advance) return
    if (editingAdvanceId === id) cancelAdvanceEdit()
    setSalaryAdvances((rows) => rows.filter((item) => item.id !== id))
    recordDeletion(
      'Monthly salary advance',
      `Advance: ${advance.id} | Staff ID: ${advance.staffId} | Employee: ${advance.employee} | Date: ${advance.date} | Amount: ${formatMoney(advance.amount, currency)} | Remarks: ${advance.remarks} | Added by: ${advance.addedBy}`,
    )
  }

  const exportPieceRateSalary = () => {
    exportFormattedExcel(
      `afg-piece-rate-salary-${selectedMonth}`,
      'AFG UNIT | Theka salary report',
      `Period: ${selectedMonth} | Generated: ${new Date().toLocaleString()} | Currency: ${currency}`,
      [
        {
          title: 'Per Person Calculated Salary',
          headers: ['Staff ID', 'Employee', 'Department', 'Item Count', 'Total PCS', 'Gross Salary', 'Advance', 'Net Payable'],
          rows: [
            ...pieceRateStaffTotals.map((row) => [
              row.member.id,
              row.member.name,
              row.member.department,
              row.itemCount,
              row.pcs,
              formatMoney(row.total, currency),
              formatMoney(row.advance, currency),
              formatMoney(row.netTotal, currency),
            ]),
            ['', 'TOTAL THEKA SALARY', '', pieceRateStaffTotals.reduce((sum, row) => sum + row.itemCount, 0), pieceRatePcs, formatMoney(pieceRateTotal, currency), formatMoney(pieceRateAdvanceTotal, currency), formatMoney(pieceRateNetTotal, currency)],
          ],
          rightAlignedColumns: [3, 4, 5, 6, 7],
          centerAlignedColumns: [0],
          highlightLastRow: true,
        },
        {
          title: 'Item-Level Salary Detail',
          headers: ['Work From', 'Work To', 'Staff ID', 'Employee', 'Department', 'Item / Work', 'PCS', 'Per Piece Rate', 'Total Amount', 'Added By'],
          rows: monthPieceRateEntries.map((entry) => [
            entry.date,
            entry.endDate || entry.date,
            entry.staffId,
            entry.employee,
            entry.department,
            entry.item,
            entry.pcs,
            formatMoney(entry.rate, currency),
            formatMoney(entry.total, currency),
            entry.addedBy,
          ]),
          rightAlignedColumns: [6, 7, 8],
          centerAlignedColumns: [0, 1, 2],
        },
        {
          title: 'Theka Advance Detail',
          headers: ['Date', 'Staff ID', 'Employee', 'Advance Amount', 'Remarks', 'Added By'],
          rows: monthPieceRateAdvances.map((advance) => [
            advance.date,
            advance.staffId,
            advance.employee,
            formatMoney(advance.amount, currency),
            advance.remarks,
            advance.addedBy,
          ]),
          rightAlignedColumns: [3],
          centerAlignedColumns: [0, 1],
        },
      ],
    )
  }

  const exportSalary = () => {
    exportFormattedExcel(
      `afg-salary-${selectedMonth}`,
      'AFG UNIT | Monthly staff salary report',
      `Period: ${selectedMonth} | Generated: ${new Date().toLocaleString()} | Currency: ${currency}`,
      [
        {
          title: 'Attendance-Based Monthly Salary',
          headers: ['Staff ID', 'Name', 'Department', 'Designation', 'Monthly Salary', 'Present Days', 'Late Days', 'Half Days', 'Absent Days', 'Paid Days', 'Calculated Salary', 'Advance', 'Net Payable'],
          rows: [
            ...salaryRows.map((row) => [
              row.member.id,
              row.member.name,
              row.member.department,
              row.member.designation,
              formatMoney(row.member.salaryAmount, currency),
              row.presentDays,
              row.lateDays,
              row.halfDays,
              row.absentDays,
              row.payableDays,
              formatMoney(row.calculatedSalary, currency),
              formatMoney(row.advance, currency),
              formatMoney(row.netPayable, currency),
            ]),
            [
              '',
              'TOTAL MONTHLY SALARY',
              '',
              '',
              formatMoney(monthlyPayroll, currency),
              salaryRows.reduce((sum, row) => sum + row.presentDays, 0),
              salaryRows.reduce((sum, row) => sum + row.lateDays, 0),
              salaryRows.reduce((sum, row) => sum + row.halfDays, 0),
              salaryRows.reduce((sum, row) => sum + row.absentDays, 0),
              salaryRows.reduce((sum, row) => sum + row.payableDays, 0),
              formatMoney(calculatedPayroll, currency),
              formatMoney(monthlyAdvanceTotal, currency),
              formatMoney(monthlyNetPayroll, currency),
            ],
          ],
          rightAlignedColumns: [4, 10, 11, 12],
          centerAlignedColumns: [0, 5, 6, 7, 8, 9],
          highlightLastRow: true,
          compact: true,
          columnWidths: [65, 115, 120, 110, 90, 65, 60, 60, 65, 60, 90, 75, 85],
        },
        {
          title: 'Monthly Salary Advance Detail',
          headers: ['Date', 'Staff ID', 'Employee', 'Advance Amount', 'Remarks', 'Added By'],
          rows: monthMonthlyAdvances.map((advance) => [
            advance.date,
            advance.staffId,
            advance.employee,
            formatMoney(advance.amount, currency),
            advance.remarks,
            advance.addedBy,
          ]),
          rightAlignedColumns: [3],
          centerAlignedColumns: [0, 1],
        },
      ],
    )
  }

  return (
    <section className="panel salary-page">
      <div className="panel-title salary-heading">
        <div>
          <h3>Staff Salary</h3>
          <p className="report-subtitle">Absent days are unpaid, half days receive 50% pay, and late days remain fully paid.</p>
        </div>
        <label className="attendance-date">
          Salary Month
          <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
        </label>
        <button className="primary-btn export-btn" onClick={exportSalary}>
          <Download size={16} /> Export Excel
        </button>
      </div>
      <section className="salary-assignment">
        <div className="panel-title salary-assignment-heading">
          <div>
            <h3>Assign Staff Salary Type</h3>
            <p className="report-subtitle">Choose whether each staff member is paid monthly or by completed pieces.</p>
          </div>
        </div>
        <div className="salary-assignment-form">
          <label>
            Staff Member
            <select value={salaryAssignment.staffId} onChange={(event) => setSalaryAssignment((assignment) => ({ ...assignment, staffId: event.target.value }))} disabled={!canManage || !assignableStaff.length}>
              {!assignableStaff.length && <option value="">No active staff</option>}
              {assignableStaff.map((member) => <option key={member.id} value={member.id}>{member.name} - {member.department}</option>)}
            </select>
          </label>
          <label>
            Salary Type
            <select value={salaryAssignment.mode} onChange={(event) => setSalaryAssignment((assignment) => ({ ...assignment, mode: event.target.value as SalaryMode }))} disabled={!canManage}>
              <option value="Monthly">Monthly Salary</option>
              <option value="Theka">Theka / Piece-Rate</option>
            </select>
          </label>
          <button className="primary-btn" type="button" onClick={assignSalaryMode} disabled={!canManage || !assignableStaff.length}>
            <Plus size={17} /> Assign Salary Type
          </button>
        </div>
        <div className="salary-assignment-summary">
          <span>Monthly: <b>{payrollStaff.length}</b></span>
          <span>Theka: <b>{pieceRateStaff.length}</b></span>
          <span>Unassigned: <b>{Math.max(0, assignableStaff.length - payrollStaff.filter((member) => member.status === 'Active').length - pieceRateStaff.length)}</b></span>
        </div>
      </section>
      <div className="attendance-stats salary-stats">
        <article><span>Monthly Staff</span><strong>{payrollStaff.length}</strong><small>{activeSalaryStaff} active</small></article>
        <article><span>Monthly Payroll</span><strong>{formatMoney(monthlyPayroll, currency)}</strong><small>Full salary total</small></article>
        <article><span>Calculated Salary</span><strong>{formatMoney(calculatedPayroll, currency)}</strong><small>Includes half-day deductions</small></article>
        <article><span>Advance Total</span><strong>{formatMoney(monthlyAdvanceTotal, currency)}</strong><small>Paid in advance</small></article>
        <article><span>Net Payable</span><strong>{formatMoney(monthlyNetPayroll, currency)}</strong><small>After advances</small></article>
      </div>
      {!canManage && <p className="permission-note">Salary updates are available to Owner and Admin.</p>}
      <DataTable
        className="salary-table"
        headers={['Staff ID', 'Name', 'Department', 'Designation', 'Monthly Salary', 'Present', 'Late Days', 'Half Days', 'Absent Days', 'Paid Days', 'Calculated Salary', 'Advance', 'Net Payable', 'Actions']}
        rows={salaryRows.map((row) => [
          row.member.id,
          row.member.name,
          row.member.department,
          row.member.designation,
          <input
            className="salary-amount-input"
            inputMode="decimal"
            aria-label={`Monthly salary for ${row.member.name}`}
            value={row.member.salaryAmount ? String(row.member.salaryAmount) : ''}
            onChange={(event) => updateSalary(row.member.id, event.target.value)}
            disabled={!canManage}
          />,
          row.presentDays,
          row.lateDays,
          row.halfDays,
          row.absentDays,
          row.payableDays,
          formatMoney(row.calculatedSalary, currency),
          formatMoney(row.advance, currency),
          formatMoney(row.netPayable, currency),
          <span className="action-cluster">
            <button className="danger-text" disabled={!canManage} onClick={() => removeFromSalary(row.member.id)}>Remove</button>
          </span>,
          ])}
      />
      <div className="salary-advance monthly-advance piece-rate-advance">
        <div className="piece-rate-person-heading">
          <div>
            <h4>Monthly Salary Advance</h4>
            <p className="report-subtitle">Record an advance paid to monthly staff. It is deducted from the calculated salary.</p>
          </div>
        </div>
        <form className="salary-advance-form piece-rate-advance-form" onSubmit={addMonthlyAdvance}>
          <label>
            Staff Member
            <select value={monthlyAdvanceDraft.staffId} onChange={(event) => setMonthlyAdvanceDraft((draft) => ({ ...draft, staffId: event.target.value }))} disabled={!canManage}>
              {payrollStaff.map((member) => <option key={member.id} value={member.id}>{member.name} - {member.department}</option>)}
            </select>
          </label>
          <label>
            Advance Date
            <input type="date" value={monthlyAdvanceDraft.date} onChange={(event) => setMonthlyAdvanceDraft((draft) => ({ ...draft, date: event.target.value }))} disabled={!canManage} />
          </label>
          <label>
            Advance Amount
            <input inputMode="decimal" placeholder="0" value={monthlyAdvanceDraft.amount} onChange={(event) => setMonthlyAdvanceDraft((draft) => ({ ...draft, amount: sanitizeAmountInput(event.target.value) }))} disabled={!canManage} />
          </label>
          <label>
            Remarks
            <input placeholder="e.g. Mid-month advance" value={monthlyAdvanceDraft.remarks} onChange={(event) => setMonthlyAdvanceDraft((draft) => ({ ...draft, remarks: event.target.value }))} disabled={!canManage} />
          </label>
          <button className="primary-btn" type="submit" disabled={!canManage || !payrollStaff.length}>
            {editingMonthlyAdvance ? <Pencil size={17} /> : <Plus size={17} />} {editingMonthlyAdvance ? 'Update Advance' : 'Add Advance'}
          </button>
          {editingMonthlyAdvance && (
            <button className="ghost-btn" type="button" onClick={cancelAdvanceEdit}>
              <X size={17} /> Cancel Edit
            </button>
          )}
        </form>
        <DataTable
          className="salary-advance-table piece-rate-advance-table"
          headers={['Date', 'Staff ID', 'Employee', 'Advance Amount', 'Remarks', 'Added By', 'Actions']}
          rows={monthMonthlyAdvances.map((advance) => [
            advance.date,
            advance.staffId,
            advance.employee,
            formatMoney(advance.amount, currency),
            advance.remarks,
            advance.addedBy,
            <span className="action-cluster">
              <button className="icon-btn" title="Edit advance" aria-label={`Edit advance for ${advance.employee}`} disabled={!canManage} onClick={() => editAdvance(advance)}><Pencil size={15} /></button>
              <button className="danger-text" disabled={!canManage} onClick={() => removeMonthlyAdvance(advance.id)}>Remove</button>
            </span>,
          ])}
        />
      </div>
      <section className="salary-piece-rate">
        <div className="panel-title salary-piece-rate-heading">
          <div>
            <h3>Theka / Piece-Rate Salary</h3>
            <p className="report-subtitle">Calculate contract wages using PCS quantity multiplied by the per-piece rate.</p>
          </div>
          <button className="ghost-btn export-btn" onClick={exportPieceRateSalary}>
            <Download size={16} /> Export Theka Salary
          </button>
        </div>
        <div className="salary-tabs" role="tablist" aria-label="Theka salary sections">
          <button type="button" className={thekaView === 'Work' ? 'active' : ''} onClick={() => setThekaView('Work')}>Piece Work</button>
          <button type="button" className={thekaView === 'Advances' ? 'active' : ''} onClick={() => setThekaView('Advances')}>Advances</button>
        </div>
        <form className={thekaView === 'Work' ? 'piece-rate-form' : 'piece-rate-form is-hidden'} onSubmit={addPieceRateEntry}>
          <label>
            Staff Member
            <select value={pieceRateDraft.staffId} onChange={(event) => setPieceRateDraft((draft) => ({ ...draft, staffId: event.target.value }))} disabled={!canManage}>
              {pieceRateStaff.map((member) => <option key={member.id} value={member.id}>{member.name} - {member.department}</option>)}
            </select>
          </label>
          <label>
            Work From
            <input type="date" value={pieceRateDraft.date} onChange={(event) => setPieceRateDraft((draft) => ({ ...draft, date: event.target.value }))} disabled={!canManage} />
          </label>
          <label>
            Work To
            <input type="date" min={pieceRateDraft.date} value={pieceRateDraft.endDate} onChange={(event) => setPieceRateDraft((draft) => ({ ...draft, endDate: event.target.value }))} disabled={!canManage} />
          </label>
          <label>
            Item / Work
            <input placeholder="e.g. Shirt stitching" value={pieceRateDraft.item} onChange={(event) => setPieceRateDraft((draft) => ({ ...draft, item: event.target.value }))} disabled={!canManage} />
          </label>
          <label>
            PCS Qty.
            <input type="number" min={1} step={1} placeholder="0" value={pieceRateDraft.pcs} onChange={(event) => setPieceRateDraft((draft) => ({ ...draft, pcs: sanitizeAmountInput(event.target.value) }))} disabled={!canManage} />
          </label>
          <label>
            Per Piece Rate
            <input inputMode="decimal" min={0} placeholder="0" value={pieceRateDraft.rate} onChange={(event) => setPieceRateDraft((draft) => ({ ...draft, rate: sanitizeAmountInput(event.target.value) }))} disabled={!canManage} />
          </label>
          <div className="piece-rate-total">
            <span>Total Amount</span>
            <strong>{formatMoney(draftTotal, currency)}</strong>
            <small>PCS x Rate</small>
          </div>
          <button className="primary-btn" type="submit" disabled={!canManage}>
            <Plus size={17} /> Add Piece-Rate Salary
          </button>
        </form>
        <div className="piece-rate-summary">
          <span>{pieceRateStaff.length} staff</span>
          <span>{monthPieceRateEntries.length} entries in {selectedMonth}</span>
          <span>{monthPieceRateAdvances.length} advances</span>
          <strong>{pieceRatePcs.toLocaleString()} PCS</strong>
          <strong>{formatMoney(pieceRateTotal, currency)} gross</strong>
          <span>{formatMoney(pieceRateAdvanceTotal, currency)} advance</span>
          <b>{formatMoney(pieceRateNetTotal, currency)} net</b>
        </div>
        <div className={thekaView === 'Advances' ? 'piece-rate-advance' : 'piece-rate-advance is-hidden'}>
          <div className="piece-rate-person-heading">
            <div>
              <h4>Theka Salary Advance</h4>
              <p className="report-subtitle">Record an advance paid to a Theka staff member. It is deducted from that person's net payable salary.</p>
            </div>
          </div>
          <form className="piece-rate-advance-form" onSubmit={addThekaAdvance}>
            <label>
              Staff Member
              <select value={advanceDraft.staffId} onChange={(event) => setAdvanceDraft((draft) => ({ ...draft, staffId: event.target.value }))} disabled={!canManage}>
                {pieceRateStaff.map((member) => <option key={member.id} value={member.id}>{member.name} - {member.department}</option>)}
              </select>
            </label>
            <label>
              Advance Date
              <input type="date" value={advanceDraft.date} onChange={(event) => setAdvanceDraft((draft) => ({ ...draft, date: event.target.value }))} disabled={!canManage} />
            </label>
            <label>
              Advance Amount
              <input inputMode="decimal" placeholder="0" value={advanceDraft.amount} onChange={(event) => setAdvanceDraft((draft) => ({ ...draft, amount: sanitizeAmountInput(event.target.value) }))} disabled={!canManage} />
            </label>
            <label>
              Remarks
              <input placeholder="e.g. Mid-month advance" value={advanceDraft.remarks} onChange={(event) => setAdvanceDraft((draft) => ({ ...draft, remarks: event.target.value }))} disabled={!canManage} />
            </label>
          <button className="primary-btn" type="submit" disabled={!canManage || !pieceRateStaff.length}>
              {editingThekaAdvance ? <Pencil size={17} /> : <Plus size={17} />} {editingThekaAdvance ? 'Update Advance' : 'Add Advance'}
            </button>
            {editingThekaAdvance && (
              <button className="ghost-btn" type="button" onClick={cancelAdvanceEdit}>
                <X size={17} /> Cancel Edit
              </button>
            )}
          </form>
          <DataTable
            className="piece-rate-advance-table"
            headers={['Date', 'Staff ID', 'Employee', 'Advance Amount', 'Remarks', 'Added By', 'Actions']}
            rows={monthPieceRateAdvances.map((advance) => [
              advance.date,
              advance.staffId,
              advance.employee,
              formatMoney(advance.amount, currency),
              advance.remarks,
              advance.addedBy,
              <span className="action-cluster">
                <button className="icon-btn" title="Edit advance" aria-label={`Edit advance for ${advance.employee}`} disabled={!canManage} onClick={() => editAdvance(advance)}><Pencil size={15} /></button>
                <button className="danger-text" disabled={!canManage} onClick={() => removeThekaAdvance(advance.id)}>Remove</button>
              </span>,
            ])}
          />
        </div>
        <div className="piece-rate-person-heading">
          <div>
            <h4>Per Person Theka Salary</h4>
            <p className="report-subtitle">Each staff member's total is calculated from all of their item entries for the selected month.</p>
          </div>
        </div>
        <DataTable
          className="piece-rate-person-table"
          headers={['Staff ID', 'Employee', 'Department', 'Items', 'Total PCS', 'Gross Salary', 'Advance', 'Net Payable']}
          rows={pieceRateStaffTotals.map((row) => [
            row.member.id,
            row.member.name,
            row.member.department,
            row.itemCount,
            row.pcs,
            formatMoney(row.total, currency),
            formatMoney(row.advance, currency),
            formatMoney(row.netTotal, currency),
          ])}
        />
        <DataTable
          className={thekaView === 'Work' ? 'piece-rate-table' : 'piece-rate-table is-hidden'}
          headers={['Work From', 'Work To', 'Staff ID', 'Employee', 'Department', 'Item / Work', 'PCS', 'Per Piece Rate', 'Total Amount', 'Added By', 'Actions']}
          rows={monthPieceRateEntries.map((entry) => [
            entry.date,
            entry.endDate || entry.date,
            entry.staffId,
            entry.employee,
            entry.department,
            entry.item,
            entry.pcs,
            formatMoney(entry.rate, currency),
            formatMoney(entry.total, currency),
            entry.addedBy,
            <button className="danger-text" disabled={!canManage} onClick={() => removePieceRateEntry(entry.id)}>Remove</button>,
          ])}
        />
      </section>
    </section>
  )
}

function AttendancePage({ records, setRecords, staff, role }: { records: AttendanceRecord[]; setRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>; staff: StaffMember[]; role: Role }) {
  const [selectedDate, setSelectedDate] = useState(getTodayText)
  const [period, setPeriod] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily')
  const [attendanceDrafts, setAttendanceDrafts] = useState<Record<string, { checkIn: string; checkOut: string }>>({})
  const canManage = role === 'Owner' || role === 'Admin'
  const activeStaff = staff.filter((member) => member.status === 'Active')
  const selected = new Date(`${selectedDate}T00:00:00`)
  const rangeStart = new Date(selected)
  const rangeEnd = new Date(selected)
  if (period === 'Weekly') {
    const day = (selected.getDay() + 6) % 7
    rangeStart.setDate(selected.getDate() - day)
    rangeEnd.setDate(rangeStart.getDate() + 6)
  } else if (period === 'Monthly') {
    rangeStart.setDate(1)
    rangeEnd.setMonth(selected.getMonth() + 1, 0)
  }
  rangeStart.setHours(0, 0, 0, 0)
  rangeEnd.setHours(23, 59, 59, 999)
  const recordsInRange = records.filter((record) => {
    const date = new Date(`${record.date}T00:00:00`)
    return date >= rangeStart && date <= rangeEnd
  })
  const dailyRows = activeStaff.map((member) => {
    const record = records.find((item) => item.staffId === member.id && item.date === selectedDate)
    return { member, record, status: record?.status || 'Absent' as AttendanceStatus }
  })
  const summaries = activeStaff.map((member) => {
    const memberRecords = recordsInRange.filter((record) => record.staffId === member.id)
    const present = memberRecords.filter((record) => record.status === 'Present').length
    const late = memberRecords.filter((record) => record.status === 'Late').length
    const halfDay = memberRecords.filter((record) => record.status === 'Half Day').length
    const rangeDays = period === 'Daily' ? 1 : Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / 86400000))
    const absent = Math.max(0, rangeDays - present - late - halfDay)
    const attendancePercent = Math.round(((present + late + halfDay * 0.5) / rangeDays) * 100)
    return { member, present, late, halfDay, absent, marked: memberRecords.length, attendancePercent }
  })
  const dailyPresent = dailyRows.filter((row) => row.status === 'Present').length
  const dailyLate = dailyRows.filter((row) => row.status === 'Late').length
  const dailyHalfDay = dailyRows.filter((row) => row.status === 'Half Day').length
  const dailyAbsent = dailyRows.filter((row) => row.status === 'Absent').length
  const reportPresent = period === 'Daily' ? dailyPresent : summaries.reduce((sum, row) => sum + row.present, 0)
  const reportLate = period === 'Daily' ? dailyLate : summaries.reduce((sum, row) => sum + row.late, 0)
  const reportHalfDay = period === 'Daily' ? dailyHalfDay : summaries.reduce((sum, row) => sum + row.halfDay, 0)
  const reportAbsent = period === 'Daily' ? dailyAbsent : summaries.reduce((sum, row) => sum + row.absent, 0)
  const draftKeyFor = (member: StaffMember) => `${selectedDate}-${member.id}`
  const manualTimeValue = (member: StaffMember, record: AttendanceRecord | undefined, field: 'checkIn' | 'checkOut') => {
    const draft = attendanceDrafts[draftKeyFor(member)]
    if (draft && field in draft) return draft[field]
    const savedValue = record?.[field]
    return savedValue && savedValue !== '-' ? formatAttendanceTime(savedValue) : ''
  }

  const updateManualTime = (member: StaffMember, field: 'checkIn' | 'checkOut', value: string) => {
    if (!canManage) return
    const key = draftKeyFor(member)
    setAttendanceDrafts((drafts) => ({
      ...drafts,
      [key]: {
        checkIn: field === 'checkIn' ? value : drafts[key]?.checkIn ?? '',
        checkOut: field === 'checkOut' ? value : drafts[key]?.checkOut ?? '',
      },
    }))
  }

  const saveManualAttendance = (member: StaffMember, record?: AttendanceRecord) => {
    if (!canManage) return
    const key = draftKeyFor(member)
    const draft = attendanceDrafts[key]
    const checkIn = (draft?.checkIn ?? (record?.checkIn && record.checkIn !== '-' ? formatAttendanceTime(record.checkIn) : '')).trim()
    const checkOut = (draft?.checkOut ?? (record?.checkOut && record.checkOut !== '-' ? formatAttendanceTime(record.checkOut) : '')).trim()
    const nextCheckIn = checkIn || '-'
    const nextCheckOut = checkOut || '-'
    const nextStatus = attendanceStatusForTimes(nextCheckIn, nextCheckOut, member.shiftStart, member.shiftEnd)
    setRecords((rows) => {
      const existing = rows.find((record) => record.staffId === member.id && record.date === selectedDate)
      const base: AttendanceRecord = existing || {
        id: `ATT-${Date.now()}-${member.id}`,
        staffId: member.id,
        date: selectedDate,
        employee: member.name,
        department: member.department,
        checkIn: '-',
        checkOut: '-',
        status: 'Absent',
      }
      const updated: AttendanceRecord = { ...base, checkIn: nextCheckIn, checkOut: nextCheckOut, status: nextStatus }
      return existing ? rows.map((record) => (record.id === existing.id ? updated : record)) : [updated, ...rows]
    })
    setAttendanceDrafts((drafts) => {
      const { [key]: _saved, ...rest } = drafts
      return rest
    })
  }

  const updateAttendance = (member: StaffMember, action: AttendanceStatus) => {
    if (!canManage) return
    setRecords((rows) => {
      const existing = rows.find((record) => record.staffId === member.id && record.date === selectedDate)
      const base: AttendanceRecord = existing || {
        id: `ATT-${Date.now()}-${member.id}`,
        staffId: member.id,
        date: selectedDate,
        employee: member.name,
        department: member.department,
        checkIn: '-',
        checkOut: '-',
        status: 'Absent',
      }
      const updated = { ...base, status: action, ...(action === 'Absent' ? { checkIn: '-', checkOut: '-' } : {}) }
      return existing ? rows.map((record) => (record.id === existing.id ? updated : record)) : [updated, ...rows]
    })
    setAttendanceDrafts((drafts) => {
      const { [draftKeyFor(member)]: _removed, ...rest } = drafts
      return rest
    })
  }

  const exportAttendance = () => {
    if (period === 'Daily') {
      exportToExcel(
        `afg-attendance-${selectedDate}`,
        ['Employee', 'Department', 'Date', 'Assigned Start', 'Assigned End', 'Check In', 'Check Out', 'Status'],
        dailyRows.map(({ member, record, status }) => [
          member.name,
          member.department,
          selectedDate,
          formatAttendanceTime(member.shiftStart),
          formatAttendanceTime(member.shiftEnd),
          formatAttendanceTime(record?.checkIn || '-'),
          formatAttendanceTime(record?.checkOut || '-'),
          status,
        ]),
      )
      return
    }
    exportToExcel(
      `afg-attendance-${period.toLowerCase()}-${selectedDate}`,
      ['Employee', 'Department', 'Present Days', 'Late Days', 'Half Days', 'Absent Days', 'Marked Days', 'Attendance %'],
      summaries.map((summary) => [summary.member.name, summary.member.department, summary.present, summary.late, summary.halfDay, summary.absent, summary.marked, `${summary.attendancePercent}%`]),
    )
  }

  return (
    <section className="panel attendance-page">
      <div className="panel-title attendance-heading">
        <div>
          <h3>Staff Attendance</h3>
          <p className="report-subtitle">Check-in at the 15-minute threshold is Late; check-out before the assigned end time is Half Day.</p>
        </div>
        <label className="attendance-date">
          Report Date
          <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </label>
        <button className="primary-btn export-btn" onClick={exportAttendance}>
          <Download size={16} /> Export Excel
        </button>
      </div>
      <div className="attendance-period-tabs">
        {(['Daily', 'Weekly', 'Monthly'] as const).map((item) => (
          <button className={period === item ? 'active' : ''} key={item} onClick={() => setPeriod(item)}>{item}</button>
        ))}
      </div>
      <div className="attendance-stats">
        <article><span>{period === 'Daily' ? 'Present' : 'Present Days'}</span><strong>{reportPresent}</strong><small>Recorded attendance</small></article>
        <article><span>{period === 'Daily' ? 'Late' : 'Late Days'}</span><strong>{reportLate}</strong><small>Needs review</small></article>
        <article><span>{period === 'Daily' ? 'Half Day' : 'Half Days'}</span><strong>{reportHalfDay}</strong><small>Left before shift end</small></article>
        <article><span>{period === 'Daily' ? 'Absent' : 'Absent Days'}</span><strong>{reportAbsent}</strong><small>Not present</small></article>
        <article><span>Total Staff</span><strong>{activeStaff.length}</strong><small>{period} view</small></article>
      </div>
      {!canManage && <p className="permission-note">Attendance updates are available to Owner and Admin.</p>}
      {period === 'Daily' ? (
        <DataTable
          className="attendance-table"
          headers={['Employee', 'Department', 'Assigned Time', 'Date', 'Check In', 'Check Out', 'Status', 'Action']}
          rows={dailyRows.map(({ member, record, status }) => {
            const checkInValue = manualTimeValue(member, record, 'checkIn')
            const checkOutValue = manualTimeValue(member, record, 'checkOut')
            const detectedStatus = checkInValue.trim()
              ? attendanceStatusForTimes(checkInValue, checkOutValue, member.shiftStart, member.shiftEnd)
              : status
            return [
              member.name,
              member.department,
              <span className="staff-shift attendance-shift" key={`attendance-shift-${member.id}`}>
                <strong>{formatAttendanceTime(member.shiftStart)}</strong>
                <small>to {formatAttendanceTime(member.shiftEnd)}</small>
              </span>,
              selectedDate,
              <input
                className="attendance-time-input"
                type="text"
                placeholder={formatAttendanceTime(member.shiftStart)}
                aria-label={`Manual check in time for ${member.name}`}
                value={checkInValue}
                onChange={(event) => updateManualTime(member, 'checkIn', event.target.value)}
                disabled={!canManage}
              />,
              <input
                className="attendance-time-input"
                type="text"
                placeholder={formatAttendanceTime(member.shiftEnd)}
                aria-label={`Manual check out time for ${member.name}`}
                value={checkOutValue}
                onChange={(event) => updateManualTime(member, 'checkOut', event.target.value)}
                disabled={!canManage}
              />,
              <span className={detectedStatus === 'Present' ? 'badge ok' : detectedStatus === 'Late' ? 'badge warn' : detectedStatus === 'Half Day' ? 'badge half-day' : 'badge danger'}>{detectedStatus}</span>,
              <span className="action-cluster attendance-actions">
                <button className="primary-btn" disabled={!canManage} onClick={() => saveManualAttendance(member, record)}>
                  <Save size={15} /> Save
                </button>
                <button className="danger-text" disabled={!canManage} onClick={() => updateAttendance(member, 'Absent')}>Absent</button>
              </span>,
            ]
          })}
        />
      ) : (
        <DataTable
          className="attendance-table"
          headers={['Employee', 'Department', 'Present Days', 'Late Days', 'Half Days', 'Absent Days', 'Marked Days', 'Attendance %']}
          rows={summaries.map((summary) => [
            summary.member.name,
            summary.member.department,
            summary.present,
            summary.late,
            summary.halfDay,
            summary.absent,
            summary.marked,
            `${summary.attendancePercent}%`,
          ])}
        />
      )}
    </section>
  )
}

function ExpensesPage(props: {
  expenses: Expense[]
  draft: { description: string; amount: number; paymentMethod: PaymentMethod; notes: string }
  setDraft: React.Dispatch<React.SetStateAction<{ description: string; amount: number; paymentMethod: PaymentMethod; notes: string }>>
  addExpense: (event: React.FormEvent<HTMLFormElement>) => void
  exportExpenses: (expenses: Expense[], periodLabel: string, total: number) => void
  currency: string
}) {
  const [expensePeriod, setExpensePeriod] = useState<'All' | 'Weekly' | 'Monthly'>('All')
  const filteredExpenses = props.expenses.filter((expense) => {
    if (expensePeriod === 'All') return true
    const expenseDate = new Date(`${expense.date}T00:00:00`)
    const currentDate = new Date()
    if (expensePeriod === 'Monthly') {
      return expenseDate.getFullYear() === currentDate.getFullYear() && expenseDate.getMonth() === currentDate.getMonth()
    }
    const weekStart = new Date(currentDate)
    weekStart.setDate(currentDate.getDate() - 6)
    weekStart.setHours(0, 0, 0, 0)
    return expenseDate >= weekStart && expenseDate <= currentDate
  })
  const visibleExpenseTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const periodLabel = expensePeriod === 'All' ? 'All records' : expensePeriod === 'Weekly' ? 'This week' : 'This month'

  return (
    <div className="two-column">
      <section className="panel">
        <h3>Add Expense</h3>
        <form className="stack-form" onSubmit={props.addExpense}>
          <input placeholder="Expense name / description" value={props.draft.description} onChange={(e) => props.setDraft((d) => ({ ...d, description: e.target.value }))} />
          <input type="number" placeholder="Amount paid" value={props.draft.amount || ''} onChange={(e) => props.setDraft((d) => ({ ...d, amount: Number(e.target.value) }))} />
          <select value={props.draft.paymentMethod} onChange={(e) => props.setDraft((d) => ({ ...d, paymentMethod: e.target.value as PaymentMethod }))}>
            <option>Cash</option>
            <option>Bank</option>
          </select>
          <textarea
            rows={3}
            placeholder="Payment details / notes"
            value={props.draft.notes}
            onChange={(e) => props.setDraft((d) => ({ ...d, notes: e.target.value }))}
          />
          <button className="primary-btn">Add Expense</button>
        </form>
      </section>
      <section className="panel wide">
        <div className="panel-title">
          <div>
            <h3>Expenses</h3>
            <p className="report-subtitle">{periodLabel} · {filteredExpenses.length} record{filteredExpenses.length === 1 ? '' : 's'}</p>
          </div>
          <button
            className="primary-btn export-btn"
            onClick={() => props.exportExpenses(filteredExpenses, periodLabel, visibleExpenseTotal)}
          >
            <Download size={16} /> Export Excel
          </button>
        </div>
        <div className="expense-period-tabs">
          {(['All', 'Weekly', 'Monthly'] as const).map((period) => (
            <button className={expensePeriod === period ? 'active' : ''} key={period} onClick={() => setExpensePeriod(period)}>
              {period === 'All' ? 'All' : period === 'Weekly' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
        <div className="expense-period-total">
          <span>{periodLabel} total</span>
          <strong>{formatMoney(visibleExpenseTotal, props.currency)}</strong>
        </div>
        <DataTable
          headers={['Expense ID', 'Date', 'Description', 'Amount', 'Payment Method', 'Added By', 'Notes']}
          rows={filteredExpenses.map((expense) => [
            expense.id,
            expense.date,
            expense.description,
            formatMoney(expense.amount, props.currency),
            expense.paymentMethod,
            expense.addedBy,
            expense.notes,
          ])}
        />
      </section>
    </div>
  )
}

function ReportsPage({
  sales,
  billingTypes,
  expenses,
  products,
  currency,
}: {
  sales: Sale[]
  billingTypes: Array<'POS' | 'DTG'>
  expenses: Expense[]
  products: Product[]
  currency: string
}) {
  const [selectedReport, setSelectedReport] = useState(
    billingTypes.includes('POS')
      ? 'POS Billing Report'
      : billingTypes.includes('DTG')
        ? 'DTG Billing Report'
        : 'Daily Sales Report',
  )
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState(sales[0]?.phone ?? '')
  const [customerBillingType, setCustomerBillingType] = useState<'POS' | 'DTG'>(
    billingTypes.includes('POS') ? 'POS' : 'DTG',
  )
  const net = sales.reduce((sum, sale) => sum + sale.total, 0)
  const totalReceived = sales.reduce((sum, sale) => sum + sale.received, 0)
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const posSales = sales.filter((sale) => billingTypeOf(sale) === 'POS')
  const dtgSales = sales.filter((sale) => billingTypeOf(sale) === 'DTG')
  const customerOptions = customerProfilesFor(sales, customerBillingType)
  const activeCustomerPhone = customerOptions.some((customer) => customer.phone === selectedCustomerPhone)
    ? selectedCustomerPhone
    : customerOptions[0]?.phone ?? ''
  const selectedCustomer = customerOptions.find((customer) => customer.phone === activeCustomerPhone)
  const customerLedgerSales = sales.filter((sale) => (
    sale.phone === activeCustomerPhone && billingTypeOf(sale) === customerBillingType
  ))
  const customerLedgerTotals = customerLedgerSales.reduce(
    (totals, sale) => ({
      billed: totals.billed + sale.total,
      received: totals.received + sale.received,
      remaining: totals.remaining + sale.remaining,
      quantity: totals.quantity + sale.items.reduce((sum, item) => sum + item.qty, 0),
      paidBills: totals.paidBills + (paymentStateOf(sale) === 'Paid' ? 1 : 0),
      pendingBills: totals.pendingBills + (paymentStateOf(sale) === 'Pending' ? 1 : 0),
    }),
    { billed: 0, received: 0, remaining: 0, quantity: 0, paidBills: 0, pendingBills: 0 },
  )
  const customerLedgerRows = customerLedgerSales.map((sale) => [
    sale.invoice,
    billingTypeOf(sale) === 'DTG' ? 'DTG Billing' : 'POS Billing',
    sale.date,
    sale.time,
    sale.items.map((item) => item.description).join(', '),
    sale.items.reduce((sum, item) => sum + item.qty, 0),
    formatMoney(sale.total, currency),
    formatMoney(sale.received, currency),
    formatMoney(sale.remaining, currency),
    sale.method,
    paymentStateOf(sale),
    sale.vehicleNumber || '-',
    sale.reference || '-',
  ])
  const reportTypes = [
    'Daily Sales Report',
    'Weekly Sales Report',
    'Monthly Sales Report',
    'Custom Date Report',
    'Product Sales Report',
    'Customer Sales Report',
    'Cash Sales Report',
    'Bank Sales Report',
    'Expense Report',
    'Stock Report',
    'Low Stock Report',
    'Profit Summary',
  ]
  const salesReportRows = sales
    .filter((sale) => {
      const typeMatches = selectedReport === 'POS Billing Report'
        ? billingTypeOf(sale) === 'POS'
        : selectedReport === 'DTG Billing Report'
          ? billingTypeOf(sale) === 'DTG'
          : true
      const paymentMatches = selectedReport === 'Cash Sales Report'
        ? sale.method === 'Cash'
        : selectedReport === 'Bank Sales Report'
          ? sale.method === 'Bank'
          : true
      const customerMatches = selectedReport === 'Customer Sales Report'
        ? sale.phone === activeCustomerPhone && billingTypeOf(sale) === customerBillingType
        : true
      return typeMatches && paymentMatches && customerMatches
    })
    .map((sale) => [
      sale.invoice,
      billingTypeOf(sale) === 'DTG' ? 'DTG Billing' : 'POS Billing',
      sale.date,
      sale.customer,
      sale.method,
      paymentStateOf(sale),
      sale.items.reduce((sum, item) => sum + item.qty, 0),
      formatMoney(sale.total, currency),
    ])
  const stockProducts = selectedReport === 'Low Stock Report' ? products.filter((product) => product.stock <= product.minStock) : products
  const isStockReport = selectedReport === 'Stock Report' || selectedReport === 'Low Stock Report'
  const isExpenseReport = selectedReport === 'Expense Report'
  const isCustomerReport = selectedReport === 'Customer Sales Report'
  const recordCount = isStockReport
    ? stockProducts.length
    : isExpenseReport
      ? expenses.length
      : isCustomerReport
        ? customerLedgerSales.length
        : salesReportRows.length
  const printCurrentReport = () => {
    document.body.classList.add('print-report')
    const cleanup = () => {
      document.body.classList.remove('print-report')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.setTimeout(() => {
      window.print()
      window.setTimeout(cleanup, 1000)
    }, 80)
  }
  const exportCurrentReport = () => {
    if (isCustomerReport) {
      const customerLabel = selectedCustomer
        ? `${selectedCustomer.name} (${selectedCustomer.phone})`
        : 'No customer selected'
      exportFormattedExcel(
        `afg-${customerBillingType.toLowerCase()}-customer-ledger-${selectedCustomer?.name.toLowerCase().replaceAll(' ', '-') || 'empty'}`,
        `AFG | ${customerBillingType} Customer Sales Ledger`,
        `${customerLabel} | ${customerLedgerSales.length} bill${customerLedgerSales.length === 1 ? '' : 's'} | Paid: ${customerLedgerTotals.paidBills} | Pending: ${customerLedgerTotals.pendingBills} | Billed: ${formatMoney(customerLedgerTotals.billed, currency)} | Received: ${formatMoney(customerLedgerTotals.received, currency)} | Balance: ${formatMoney(customerLedgerTotals.remaining, currency)}`,
        [
          {
            title: `${customerBillingType} Billing Ledger`,
            headers: ['Invoice', 'Billing Type', 'Date', 'Time', 'Items', 'Qty.', 'Billed', 'Received', 'Balance', 'Payment', 'Status', 'Vehicle', 'Reference'],
            rows: [
              ...customerLedgerRows,
              ['', '', '', '', 'TOTAL', customerLedgerTotals.quantity, formatMoney(customerLedgerTotals.billed, currency), formatMoney(customerLedgerTotals.received, currency), formatMoney(customerLedgerTotals.remaining, currency), '', '', '', ''],
            ],
            rightAlignedColumns: [5, 6, 7, 8],
            centerAlignedColumns: [0, 1, 2, 3, 9, 10, 11],
            highlightLastRow: true,
          },
        ],
      )
      return
    }
    if (isStockReport) {
      exportToExcel(
        `afg-${selectedReport.toLowerCase().replaceAll(' ', '-')}`,
        ['Article', 'Description', 'Category', 'Stock', 'Sale Rate'],
        stockProducts.map((product) => [product.article, product.description, product.category, product.stock, formatMoney(product.rate, currency)]),
      )
      return
    }
    if (isExpenseReport) {
      exportToExcel(
        'afg-expense-report',
        ['Expense ID', 'Date', 'Description', 'Amount', 'Payment Method', 'Added By', 'Notes'],
        expenses.map((expense) => [expense.id, expense.date, expense.description, formatMoney(expense.amount, currency), expense.paymentMethod, expense.addedBy, expense.notes]),
      )
      return
    }
    exportToExcel(`afg-${selectedReport.toLowerCase().replaceAll(' ', '-')}`, ['Invoice', 'Billing Type', 'Date', 'Customer', 'Payment', 'Payment Status', 'Qty.', 'Net Total'], salesReportRows)
  }
  return (
    <div className="dashboard-grid reports-view">
      <section className="panel wide report-summary-panel">
        <div className="panel-title">
          <div>
            <h3>Report Summary</h3>
            <p className="report-subtitle">Live totals from recorded sales and expenses</p>
          </div>
          <span className="report-period">All records</span>
        </div>
        <div className="report-kpis">
          <article className="report-kpi">
            <span>Total Sales</span>
            <strong>{formatMoney(net, currency)}</strong>
            <small>All recorded bills</small>
          </article>
          <article className="report-kpi">
            <span>Total Received</span>
            <strong>{formatMoney(totalReceived, currency)}</strong>
            <small>Collected payments</small>
          </article>
          <article className="report-kpi">
            <span>Expenses</span>
            <strong>{formatMoney(expenseTotal, currency)}</strong>
            <small>Recorded costs</small>
          </article>
          <article className="report-kpi emphasis balance">
            <span>Final Balance</span>
            <strong>{formatMoney(net - expenseTotal, currency)}</strong>
            <small>Net sales less expenses</small>
          </article>
        </div>
        <div className="report-balance-bar">
          <div>
            <span>Sales against expenses</span>
            <b>{formatMoney(Math.max(0, net - expenseTotal), currency)}</b>
          </div>
          <div className="balance-track">
            <span style={{ width: `${net ? Math.min(100, (Math.max(0, net - expenseTotal) / net) * 100) : 0}%` }} />
          </div>
        </div>
        <BillingTypeSummary sales={[...posSales, ...dtgSales]} currency={currency} billingTypes={billingTypes} />
      </section>
      <section className="panel report-types-panel">
        <div className="panel-title">
          <h3>Report Types</h3>
          <span className="report-count">{reportTypes.length}</span>
        </div>
        <div className="report-type-list">
          {reportTypes.map((report) => (
            <button
              className={`report-link ${selectedReport === report ? 'active' : ''} ${report === 'DTG Billing Report' ? 'dtg-report-link' : report === 'POS Billing Report' ? 'pos-report-link' : ''}`}
              key={report}
              onClick={() => setSelectedReport(report)}
            >
              {report}
            </button>
          ))}
        </div>
        <p className="report-selection">Selected: <strong>{selectedReport}</strong></p>
      </section>
      <section className="panel wide report-table-panel">
        <div className="billing-report-tabs">
          {!isCustomerReport && billingTypes.includes('POS') && (
            <button
              className={selectedReport === 'POS Billing Report' ? 'billing-report-tab pos active' : 'billing-report-tab pos'}
              onClick={() => setSelectedReport('POS Billing Report')}
            >
              <ShoppingCart size={16} /> POS Billing
            </button>
          )}
          {!isCustomerReport && billingTypes.includes('DTG') && (
            <button
              className={selectedReport === 'DTG Billing Report' ? 'billing-report-tab dtg active' : 'billing-report-tab dtg'}
              onClick={() => setSelectedReport('DTG Billing Report')}
            >
              <ReceiptText size={16} /> DTG Billing
            </button>
          )}
          {isCustomerReport && billingTypes.includes('POS') && (
            <button
              className={customerBillingType === 'POS' ? 'billing-report-tab pos active' : 'billing-report-tab pos'}
              onClick={() => setCustomerBillingType('POS')}
            >
              <ShoppingCart size={16} /> POS Customer Ledger
            </button>
          )}
          {isCustomerReport && billingTypes.includes('DTG') && (
            <button
              className={customerBillingType === 'DTG' ? 'billing-report-tab dtg active' : 'billing-report-tab dtg'}
              onClick={() => setCustomerBillingType('DTG')}
            >
              <ReceiptText size={16} /> DTG Customer Ledger
            </button>
          )}
          <button className="primary-btn export-btn billing-report-export" onClick={exportCurrentReport}>
            <Download size={16} /> Export Excel
          </button>
        </div>
        {isCustomerReport && (
          <div className="customer-ledger-controls screen-only">
            <label>
              Select Customer
              <select value={activeCustomerPhone} onChange={(event) => setSelectedCustomerPhone(event.target.value)}>
                {customerOptions.length ? (
                  customerOptions.map((customer) => (
                    <option value={customer.phone} key={customer.phone}>
                      {customer.category} -{' '}
                      {customer.name} · {customer.phone}
                    </option>
                  ))
                ) : (
                  <option value="">No customers available</option>
                )}
              </select>
            </label>
            <p>Choose a customer and billing type to view the complete invoice ledger.</p>
          </div>
        )}
        <div className="panel-title">
          <div>
            <h3>{selectedReport}</h3>
            <p className="report-subtitle">
              {isCustomerReport && selectedCustomer
                ? `${selectedCustomer.name} · ${selectedCustomer.phone} · ${customerBillingType} billing`
                : `${recordCount} record${recordCount === 1 ? '' : 's'} available`}
            </p>
          </div>
          <span className="report-count">{recordCount}</span>
          <button className="ghost-btn export-btn screen-only" onClick={printCurrentReport}>
            <Printer size={16} /> Print Report
          </button>
        </div>
        {isStockReport ? (
          <DataTable
            headers={['Image', 'Article', 'Description', 'Category', 'Stock', 'Sale Rate']}
            rows={stockProducts.map((product) => [
              product.image ? <img className="product-thumb" src={product.image} alt={product.description} /> : <span className="product-thumb-placeholder">No image</span>,
              product.article,
              product.description,
              product.category,
              product.stock,
              formatMoney(product.rate, currency),
            ])}
          />
        ) : isExpenseReport ? (
          <DataTable
            headers={['Expense ID', 'Date', 'Description', 'Amount', 'Payment Method', 'Added By', 'Notes']}
            rows={expenses.map((expense) => [
              expense.id,
              expense.date,
              expense.description,
              formatMoney(expense.amount, currency),
              expense.paymentMethod,
              expense.addedBy,
              expense.notes,
            ])}
          />
        ) : isCustomerReport ? (
          <>
            <div className="customer-ledger-summary">
              <div>
                <span>Customer</span>
                <strong>{selectedCustomer?.name || 'No customer selected'}</strong>
                <small>{selectedCustomer?.phone || '-'}</small>
              </div>
              <div>
                <span>Total Bills</span>
                <strong>{customerLedgerSales.length}</strong>
                <small>{customerBillingType} billing</small>
              </div>
              <div>
                <span>Paid Bills</span>
                <strong>{customerLedgerTotals.paidBills}</strong>
                <small>fully paid</small>
              </div>
              <div className="balance">
                <span>Pending Bills</span>
                <strong>{customerLedgerTotals.pendingBills}</strong>
                <small>payment due</small>
              </div>
              <div>
                <span>Total Quantity</span>
                <strong>{customerLedgerTotals.quantity}</strong>
                <small>pieces</small>
              </div>
              <div>
                <span>Total Billed</span>
                <strong>{formatMoney(customerLedgerTotals.billed, currency)}</strong>
                <small>ledger value</small>
              </div>
              <div>
                <span>Received</span>
                <strong>{formatMoney(customerLedgerTotals.received, currency)}</strong>
                <small>payments</small>
              </div>
              <div className="balance">
                <span>Outstanding</span>
                <strong>{formatMoney(customerLedgerTotals.remaining, currency)}</strong>
                <small>remaining balance</small>
              </div>
            </div>
            <DataTable
              className="customer-ledger-table"
              headers={['Invoice', 'Billing Type', 'Date', 'Time', 'Items', 'Qty.', 'Billed', 'Received', 'Balance', 'Payment', 'Status', 'Vehicle', 'Reference']}
              rows={customerLedgerRows}
            />
          </>
        ) : (
          <DataTable
            headers={['Invoice', 'Billing Type', 'Date', 'Customer', 'Payment', 'Payment Status', 'Qty.', 'Net Total']}
            rows={salesReportRows}
          />
        )}
      </section>
    </div>
  )
}

function UsersPage({
  role,
  users,
  setUsers,
  currentUserId,
  permissions,
  setPermissions,
}: {
  role: Role
  users: UserAccount[]
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>
  currentUserId: string | null
  permissions: Record<ManagedRole, Page[]>
  setPermissions: React.Dispatch<React.SetStateAction<Record<ManagedRole, Page[]>>>
}) {
  const [showUserPassword, setShowUserPassword] = useState(false)
  const [formMessage, setFormMessage] = useState('')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    name: '',
    username: '',
    password: '',
  })
  const isOwner = role === 'Owner'
  const selectedPermissions = permissions.Admin
  const editingUser = editingUserId ? users.find((account) => account.id === editingUserId) : undefined

  const togglePermission = (permission: Page) => {
    if (!isOwner) return
    setPermissions((current) => ({
      ...current,
      Admin: current.Admin.includes(permission)
        ? current.Admin.filter((item) => item !== permission)
        : [...current.Admin, permission],
    }))
  }

  const addUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isOwner) return
    const username = draft.username.trim().toLowerCase()
    if (!draft.name.trim() || !username || (!editingUser && !draft.password)) {
      setFormMessage(`Full name and username are required${editingUser ? '.' : ', along with a password.'}`)
      return
    }
    if (/\s/.test(username)) {
      setFormMessage('Username cannot contain spaces.')
      return
    }
    if (draft.password && draft.password.length < 4) {
      setFormMessage('Password must contain at least 4 characters.')
      return
    }
    if (users.some((account) => account.id !== editingUserId && account.username.toLowerCase() === username)) {
      setFormMessage('That username is already in use.')
      return
    }
    if (editingUser) {
      setUsers((accounts) => accounts.map((account) => (
        account.id === editingUser.id
          ? {
              ...account,
              name: draft.name.trim(),
              username,
              password: draft.password || account.password,
            }
          : account
      )))
      setDraft({ name: '', username: '', password: '' })
      setEditingUserId(null)
      setShowUserPassword(false)
      setFormMessage('Admin login account updated.')
      return
    }
    setUsers((accounts) => [
      ...accounts,
      {
        id: `USR-${Date.now()}`,
        name: draft.name.trim(),
        username,
        password: draft.password,
        role: 'Admin',
        status: 'Active',
        created: getTodayText(),
      },
    ])
    setDraft({ name: '', username: '', password: '' })
    setShowUserPassword(false)
    setFormMessage('Admin login account created.')
  }

  const startUserEdit = (account: UserAccount) => {
    if (!isOwner || account.role === 'Owner') return
    setEditingUserId(account.id)
    setDraft({ name: account.name, username: account.username, password: '' })
    setShowUserPassword(false)
    setFormMessage('')
  }

  const cancelUserEdit = () => {
    setEditingUserId(null)
    setDraft({ name: '', username: '', password: '' })
    setShowUserPassword(false)
    setFormMessage('')
  }

  const toggleUserStatus = (account: UserAccount) => {
    if (!isOwner || account.role === 'Owner' || account.id === currentUserId) return
    setUsers((accounts) => accounts.map((item) => (
      item.id === account.id ? { ...item, status: item.status === 'Active' ? 'Inactive' : 'Active' } : item
    )))
  }

  const deleteUser = (account: UserAccount) => {
    if (!isOwner || account.role === 'Owner' || account.id === currentUserId) return
    if (!window.confirm(`Delete the login account for ${account.name}?`)) return
    setUsers((accounts) => accounts.filter((item) => item.id !== account.id))
  }

  return (
    <section className="panel user-management">
      <div className="user-management-heading">
        <div>
          <h3>User Management & Permissions</h3>
          <p className="report-subtitle">Create Admin login accounts and control their page access.</p>
        </div>
        <span className="owner-badge">{isOwner ? 'Owner control enabled' : `Signed in as ${role}`}</span>
      </div>
      {isOwner ? (
        <div className="user-create-workspace">
          <div>
            <h3>{editingUser ? 'Edit Admin Login' : 'Add User Login'}</h3>
            <p className="report-subtitle">
              {editingUser
                ? 'Update the name or username. Leave password blank to keep the current password.'
                : 'Create a username and password. Every added account receives the Admin role.'}
            </p>
          </div>
          <form className="user-create-form" onSubmit={addUser}>
            <label>
              Full Name
              <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="User full name" required />
            </label>
            <label>
              Username
              <input value={draft.username} onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value }))} placeholder="Login username" autoComplete="off" required />
            </label>
            <label>
              Password
              <span className="password-field">
                <input
                  type={showUserPassword ? 'text' : 'password'}
                  value={draft.password}
                  onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
                  placeholder={editingUser ? 'Leave blank to keep password' : 'Minimum 4 characters'}
                  autoComplete="new-password"
                  required={!editingUser}
                />
                <button type="button" onClick={() => setShowUserPassword((value) => !value)} aria-label="Show new user password">
                  {showUserPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
            <div className="user-form-actions">
              <button className="primary-btn" type="submit">
                {editingUser ? <><Save size={17} /> Update User</> : <><UserPlus size={17} /> Add User</>}
              </button>
              {editingUser && <button className="ghost-btn" type="button" onClick={cancelUserEdit}>Cancel</button>}
            </div>
          </form>
          {formMessage && <p className="user-form-message">{formMessage}</p>}
        </div>
      ) : (
        <p className="permission-note">Only the Owner can create Admin accounts.</p>
      )}
      <div className="permission-workspace">
        <div className="permission-heading">
          <div>
            <h3>Admin Page Permissions</h3>
            <p className="report-subtitle">Enable the pages that Admin accounts can open.</p>
          </div>
        </div>
        <div className="permission-grid">
          {permissionOptions.map((permission) => (
            <label className="permission-row" key={permission}>
              <span>{permission}</span>
              <input
                type="checkbox"
                checked={selectedPermissions.includes(permission)}
                disabled={!isOwner}
                onChange={() => togglePermission(permission)}
              />
            </label>
          ))}
        </div>
        {!isOwner && <p className="permission-note">Only the Owner can change these permissions.</p>}
      </div>
      <DataTable
        headers={['Full Name', 'Username', 'Role', 'Access', 'Status', 'Created Date', 'Actions']}
        rows={users.map((account) => [
          account.name,
          account.username,
          account.role === 'Owner' ? (
            <span className="owner-badge compact" key={`role-${account.id}`}>Owner</span>
          ) : (
            <span className="badge ok" key={`role-${account.id}`}>Admin</span>
          ),
          account.role === 'Owner' ? 'Full access' : `${permissions[account.role].length} pages`,
          <span className={account.status === 'Active' ? 'badge ok' : 'badge danger'} key={`status-${account.id}`}>{account.status}</span>,
          account.created,
          <span className="action-cluster" key={`actions-${account.id}`}>
            {account.role === 'Owner' ? (
              <small>Protected account</small>
            ) : (
              <>
                <button type="button" disabled={!isOwner} onClick={() => startUserEdit(account)}>Edit</button>
                <button type="button" disabled={!isOwner} onClick={() => toggleUserStatus(account)}>
                  {account.status === 'Active' ? 'Deactivate' : 'Activate'}
                </button>
                <button className="danger-text" type="button" disabled={!isOwner} onClick={() => deleteUser(account)}>Delete</button>
              </>
            )}
          </span>,
        ])}
      />
    </section>
  )
}

function SettingsPage({ settings, setSettings }: { settings: CompanySettings; setSettings: React.Dispatch<React.SetStateAction<CompanySettings>> }) {
  const update = (key: keyof CompanySettings, value: string | number | boolean) => {
    setSettings((current) => {
      const updated = { ...current, [key]: value }
      persistCompanySettings(updated)
      return updated
    })
  }
  return (
    <div className="settings-grid">
      <section className="panel">
        <h3>Company Settings</h3>
        <label>
          Upload Company Logo
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => update('logo', String(reader.result))
              reader.readAsDataURL(file)
            }}
          />
        </label>
        {(['companyName', 'businessName', 'address', 'phone', 'whatsapp', 'email', 'website', 'ntn', 'strn', 'currency', 'footerMessage', 'thankYou'] as const).map((key) => (
          <label key={key}>
            {key.replace(/([A-Z])/g, ' $1')}
            <input value={String(settings[key])} onChange={(event) => update(key, event.target.value)} />
          </label>
        ))}
      </section>
      <section className="panel">
        <h3>Invoice & Print Settings</h3>
        <label>
          Invoice Prefix
          <input value={settings.invoicePrefix} onChange={(event) => update('invoicePrefix', event.target.value)} />
        </label>
        <label>
          Starting Invoice Number
          <input type="number" value={settings.startingNumber} onChange={(event) => update('startingNumber', Number(event.target.value))} />
        </label>
        <label>
          Default Print Size
          <select value={settings.defaultPrintSize} onChange={(event) => update('defaultPrintSize', event.target.value)}>
            <option>A4</option>
            <option>80mm Thermal</option>
          </select>
        </label>
        {[
          ['showLogo', 'Show Logo'],
          ['showSignature', 'Show Signature Line'],
        ].map(([key, label]) => (
          <label className="check-row" key={key}>
            <input type="checkbox" checked={Boolean(settings[key as keyof CompanySettings])} onChange={(event) => update(key as keyof CompanySettings, event.target.checked)} />
            {label}
          </label>
        ))}
        <label>
          Low Stock Limit
          <input type="number" value={settings.lowStockLimit} onChange={(event) => update('lowStockLimit', Number(event.target.value))} />
        </label>
        <button
          className="primary-btn"
          onClick={() => alert(
            persistCompanySettings(settings)
              ? 'Settings saved successfully.'
              : 'Unable to save settings. Please use a smaller logo image and try again.',
          )}
        >
          Save Settings
        </button>
      </section>
    </div>
  )
}

function DataTable({ headers, rows, className = '' }: { headers: string[]; rows: React.ReactNode[][]; className?: string }) {
  return (
    <div className={`table-wrap ${className}`.trim()}>
      <table>
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="empty-cell">
                No records found.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} data-label={headers[cellIndex]}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function InvoiceModal({ sale, settings, onClose, onPrint }: { sale: Sale; settings: CompanySettings; onClose: () => void; onPrint: () => void }) {
  return (
    <div className="modal-backdrop invoice-backdrop">
      <div className={`invoice-modal ${settings.defaultPrintSize === '80mm Thermal' ? 'receipt-size' : ''}`}>
        <div className="modal-actions screen-only">
          <button onClick={onClose}>
            <X size={17} /> Close
          </button>
          <button className="primary-btn" onClick={onPrint}>
            <Printer size={17} /> Print Invoice
          </button>
        </div>
        <Invoice sale={sale} settings={settings} />
      </div>
    </div>
  )
}

function Invoice({ sale, settings }: { sale: Sale; settings: CompanySettings }) {
  const isDtgSale = billingTypeOf(sale) === 'DTG'
  return (
    <article className="invoice-print">
      <div className="invoice-corner-label">{settings.businessName} | {settings.companyName} POS</div>
      <header className="invoice-header">
        {settings.showLogo && <img src={settings.logo} alt="AFG logo" />}
        <h1>{settings.companyName}</h1>
        <p>{settings.address}</p>
        <p>
          Phone: {settings.phone} | {settings.email}
        </p>
        {(settings.ntn || settings.strn) && (
          <p>
            NTN: {settings.ntn || '-'} | STRN: {settings.strn || '-'}
          </p>
        )}
      </header>
      <section className="invoice-meta">
        <span>Invoice No: {sale.invoice}</span>
        <span>Date: {sale.date}</span>
        <span>Time: {sale.time}</span>
        <span>Processed By: {sale.cashier}</span>
        <span>Billing: {isDtgSale ? 'DTG' : 'POS'}</span>
        <span>Customer: {sale.customer}</span>
        <span>Phone: {sale.phone}</span>
        {sale.vehicleNumber && <span>Vehicle No: {sale.vehicleNumber}</span>}
        <span>Payment: {sale.method}</span>
        {sale.method === 'Bank' && sale.bankName && <span>Bank: {sale.bankName}</span>}
        <span>Payment Status: {sale.paymentStatus}</span>
        {sale.reference && <span>Reference: {sale.reference}</span>}
        {sale.remarks && <span className="invoice-note">{sale.remarks}</span>}
      </section>
      <table className="invoice-table">
        <thead>
          {isDtgSale ? (
            <tr>
              <th>No.</th>
              <th>Item</th>
              <th>Size</th>
              <th>Print Area</th>
              <th>Rate / sq in</th>
              <th>Amount / Piece</th>
              <th>Pieces</th>
              <th>Total Amount</th>
            </tr>
          ) : (
            <tr>
              <th>No.</th>
              <th>Description</th>
              <th>Article</th>
              <th>Qty.</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          )}
        </thead>
        <tbody>
          {sale.items.map((item, index) => (
            <tr key={`${item.productId}-${index}`}>
              <td>{index + 1}</td>
              <td>{item.description}</td>
              {isDtgSale ? (
                <>
                  <td>{item.width && item.height ? `${item.width} x ${item.height} in` : '-'}</td>
                  <td>{printAreaOf(item).toLocaleString()} sq in</td>
                  <td>{formatMoney(item.rate, settings.currency)}</td>
                  <td>{formatMoney(amountPerPieceOf(item), settings.currency)}</td>
                  <td>{item.qty}</td>
                  <td>{formatMoney(amountOf(item), settings.currency)}</td>
                </>
              ) : (
                <>
                  <td>{item.article}</td>
                  <td>{item.qty}</td>
                  <td>{formatMoney(item.rate, settings.currency)}</td>
                  <td>{formatMoney(amountOf(item), settings.currency)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <section className="invoice-totals">
        <SummaryLine label={isDtgSale ? 'Total Pieces' : 'Total Quantity'} value={`${sale.items.reduce((sum, item) => sum + item.qty, 0)}`} />
        {isDtgSale && <SummaryLine label="Total Print Area" value={`${sale.items.reduce((sum, item) => sum + printAreaOf(item) * item.qty, 0).toLocaleString()} sq in`} />}
        <SummaryLine label={isDtgSale ? 'Total Amount' : 'Subtotal'} value={formatMoney(sale.subtotal, settings.currency)} />
        <SummaryLine label="Grand Total" value={formatMoney(sale.total, settings.currency)} strong />
        <SummaryLine label="Received Amount" value={formatMoney(sale.received, settings.currency)} />
        <SummaryLine label="Remaining Amount" value={formatMoney(sale.remaining, settings.currency)} />
        {sale.change > 0 && <SummaryLine label="Change Amount" value={formatMoney(sale.change, settings.currency)} />}
      </section>
      <footer className="invoice-footer">
        <p>{settings.thankYou}</p>
        <p>{settings.footerMessage}</p>
        {settings.showSignature && <span>Authorized Signature: __________________</span>}
      </footer>
    </article>
  )
}

export default App
