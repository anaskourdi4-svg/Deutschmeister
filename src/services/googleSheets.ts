import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('لم يتم الحصول على رمز الوصول من حساب Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

/**
 * List Google Sheets files owned or accessible by user in Google Drive
 */
export async function listUserSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime%20desc&pageSize=30&fields=files(id,name,modifiedTime,webViewLink)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`خطأ في الوصول إلى Google Drive: ${response.statusText} (${errText})`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Extract Spreadsheet ID from full URL or return ID directly
 */
export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    return match[1];
  }
  return trimmed;
}

export interface GoogleSheetData {
  title: string;
  spreadsheetId: string;
  rows: string[][];
}

/**
 * Fetch rows from Google Sheet by Spreadsheet ID
 */
export async function fetchSpreadsheetRows(
  spreadsheetId: string,
  accessToken: string
): Promise<GoogleSheetData> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error('يرجى إدخال رابط أو معرف Google Sheet صحيح.');
  }

  // 1. Get spreadsheet metadata to know sheet names
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title,sheets.properties`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!metaRes.ok) {
    if (metaRes.status === 404) {
      throw new Error('لم يتم العثور على Google Sheet. تأكد من صحة الرابط أو المعرف.');
    }
    if (metaRes.status === 403) {
      throw new Error('ليس لديك صلاحية للوصول إلى هذا الشيت. يرجى التأكد من الحساب المسجل.');
    }
    throw new Error(`فشل جلب بيانات الشيت (${metaRes.statusText})`);
  }

  const metaData = await metaRes.json();
  const docTitle = metaData.properties?.title || 'Google Sheet';
  const sheets = metaData.sheets || [];
  if (sheets.length === 0) {
    throw new Error('الملف لا يحتوي على أوراق عمل (Sheets).');
  }

  const firstSheetTitle = sheets[0].properties?.title || 'Sheet1';
  const range = encodeURIComponent(`${firstSheetTitle}!A1:Z2000`);

  // 2. Fetch sheet values
  const valuesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${range}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!valuesRes.ok) {
    throw new Error(`فشل قراءة محتوى الشيت (${valuesRes.statusText})`);
  }

  const valuesData = await valuesRes.json();
  const rows: string[][] = valuesData.values || [];

  return {
    title: docTitle,
    spreadsheetId: cleanId,
    rows,
  };
}
