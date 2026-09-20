import AsyncStorage from '@react-native-async-storage/async-storage';

/** Версия приложения — единственное место объявления, синхронизировать с
 * "version" в app.json при каждом релизе. Сравнивается с `latestAppVersion`
 * из CRM, чтобы показать модалку «Доступна новая версия». */
export const APP_VERSION = '1.3.0';

const LAST_SHOWN_KEY = '@new_version_modal_last_shown_date';

/** Текущая дата в формате YYYY-MM-DD для часового пояса Алматы (UTC+5) */
const getDateYmdAlmaty = (date: Date): string => {
  const almatyTime = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  return almatyTime.toISOString().split('T')[0];
};

/** Показываем модалку не чаще раза в день (по календарю Алматы) и только если
 * в CRM настроена версия, отличная от установленной. */
export async function shouldShowNewVersionModal(
  latestAppVersion?: string | null,
): Promise<boolean> {
  if (!latestAppVersion || latestAppVersion === APP_VERSION) return false;
  try {
    const lastShown = await AsyncStorage.getItem(LAST_SHOWN_KEY);
    return lastShown !== getDateYmdAlmaty(new Date());
  } catch {
    return false;
  }
}

export async function markNewVersionModalShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SHOWN_KEY, getDateYmdAlmaty(new Date()));
  } catch {
    /* AsyncStorage недоступен — не блокируем закрытие модалки */
  }
}
