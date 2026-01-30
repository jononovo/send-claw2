'use client';

import dynamic from 'next/dynamic';

const QuestsPage = dynamic(
  () => import("@/features/guidance-engine").then(module => ({ default: module.QuestsPage })),
  { ssr: false }
);

export default function Quests() {
  return <QuestsPage />;
}
