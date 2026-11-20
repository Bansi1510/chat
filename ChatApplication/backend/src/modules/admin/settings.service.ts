import { AppSetting } from '../../models/AppSetting';

export async function getSettings() {
  const doc = await AppSetting.findOneAndUpdate(
    { key: 'app' },
    { $setOnInsert: { key: 'app' } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  return doc;
}

export async function updateSettings(patch: Record<string, unknown>) {
  await getSettings();
  return AppSetting.findOneAndUpdate({ key: 'app' }, { $set: patch }, { new: true, runValidators: true }).lean();
}
