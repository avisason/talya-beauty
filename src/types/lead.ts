export type Source = 'אינסטגרם' | 'טיקטוק' | 'פייסבוק' | 'אימייל' | 'טלפון';
export type Status = 'חדש' | 'מענה ראשוני' | 'פולואפ' | 'נסגר';
export type InquiryType = 'איפור ערב' | 'שיער ערב' | 'איפור + שיער ערב' | 'כלה חלקי' | 'כלה מלא';

export interface Lead {
  id: string;
  fullName: string;
  eventDate: string;
  source: Source;
  status: Status;
  inquiryType: InquiryType;
  closed: boolean;
  advancePayment: boolean;
  additionalDetails: string;
  importantNotes: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadFormData = Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>;
