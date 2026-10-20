import { getMessages } from "@/lib/locale";

import { SettingsForm } from "./settings-form";

const SettingsPage = async () => {
  const t = await getMessages();

  return (
    <div className="mx-auto flex h-full max-w-[600px] flex-col gap-y-6 px-6">
      <h1 className="text-2xl font-bold text-neutral-700">
        {t.settings.title}
      </h1>
      <SettingsForm />
    </div>
  );
};

export default SettingsPage;
