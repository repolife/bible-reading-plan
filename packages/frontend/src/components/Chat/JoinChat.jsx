import { ChatAccount } from "@components/Account/ChatAccount";

const storeLink =
  "flex-1 py-2.5 rounded-lg border border-[#c8e8e9] text-[#0e9496] text-sm font-medium text-center hover:bg-[#f0fafa] transition-colors";

// One page to share with people moving over from Telegram.
export const JoinChat = () => (
  <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
    <div className="bg-[#0e9496] rounded-2xl p-5 space-y-1">
      <h1 className="text-white font-bold text-lg">Join our chat</h1>
      <p className="text-white/90 text-sm">
        We&apos;re moving from Telegram to our own private chat. It takes about two minutes, and it&apos;s easiest on your phone.
      </p>
    </div>

    <div className="bg-white border border-[#c8e8e9] rounded-2xl p-5 space-y-3">
      <h2 className="font-semibold text-gray-900">1. Get the app</h2>
      <p className="text-sm text-gray-700">Install Element X on your phone, then come back to this page.</p>
      <div className="flex gap-2">
        <a className={storeLink} href="https://apps.apple.com/app/id1631335820" target="_blank" rel="noreferrer">
          iPhone
        </a>
        <a className={storeLink} href="https://play.google.com/store/apps/details?id=io.element.android.x" target="_blank" rel="noreferrer">
          Android
        </a>
      </div>
      <p className="text-xs text-gray-500">On a computer? Skip this step. Chat also works in your browser.</p>
    </div>

    <div className="bg-white border border-[#c8e8e9] rounded-2xl p-5 space-y-3">
      <h2 className="font-semibold text-gray-900">2. Create your account and sign in</h2>
      <ChatAccount />
    </div>
  </div>
);
