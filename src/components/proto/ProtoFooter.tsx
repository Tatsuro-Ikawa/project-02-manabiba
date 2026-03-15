'use client';

import Link from 'next/link';

export default function ProtoFooter() {
  return (
    <footer className="home-footer" role="contentinfo">
      <div className="home-footer-links">
        <Link href="/terms">利用規約</Link>
        <Link href="/privacy">プライバシーポリシー</Link>
      </div>
      <div className="home-footer-copyright">
        &copy; 2025 人生学び場　こころ道場 All rights reserved.
      </div>
    </footer>
  );
}
