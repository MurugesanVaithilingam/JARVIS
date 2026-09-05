"""
===================================================================
J.A.R.V.I.S. V1 — BROWSER AUTOMATION MODULE (PLAYWRIGHT)
===================================================================
Provides browser control capabilities: opening URLs, searching web,
navigating pages, and extracting page contents cleanly.
"""

import logging
import asyncio
from typing import Dict, Any

logger = logging.getLogger("JarvisBrowser")

class BrowserController:
    def __init__(self, headless: bool = False):
        self.headless = headless
        self._browser = None
        self._page = None

    async def initialize(self):
        try:
            from playwright.async_api import async_playwright
            playwright = await async_playwright().start()
            self._browser = await playwright.chromium.launch(headless=self.headless)
            self._page = await self._browser.new_page()
            logger.info("Playwright Browser Automation Initialized!")
        except Exception as e:
            logger.warning(f"Playwright async init notice (install via `playwright install`): {e}")

    async def open_url(self, url: str) -> Dict[str, Any]:
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        try:
            if not self._page:
                await self.initialize()
            if self._page:
                await self._page.goto(url, wait_until="domcontentloaded")
                title = await self._page.title()
                return {"status": "success", "url": url, "title": title}
            else:
                import webbrowser
                webbrowser.open(url)
                return {"status": "success", "url": url, "message": "Opened via default browser fallback"}
        except Exception as e:
            import webbrowser
            webbrowser.open(url)
            return {"status": "success", "url": url, "fallback": True, "error": str(e)}

    async def search_google(self, query: str) -> Dict[str, Any]:
        search_url = f"https://www.google.com/search?q={query.replace(' ', '+')}"
        return await self.open_url(search_url)

    async def read_page(self, max_chars: int = 4000) -> Dict[str, Any]:
        """Extract visible text from the current DOM — no mouse coordinates."""
        try:
            if not self._page:
                return {"status": "error", "message": "No active browser page. Open a URL first."}
            title = await self._page.title()
            url = self._page.url
            text = await self._page.inner_text("body")
            text = " ".join((text or "").split())
            return {
                "status": "success",
                "title": title,
                "url": url,
                "summary": text[:max_chars],
                "length": len(text),
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def new_tab(self, url: str) -> Dict[str, Any]:
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        try:
            if not self._browser:
                await self.initialize()
            if not self._browser:
                return await self.open_url(url)
            self._page = await self._browser.new_page()
            await self._page.goto(url, wait_until="domcontentloaded")
            return {"status": "success", "url": url, "title": await self._page.title()}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def close(self):
        if self._browser:
            await self._browser.close()
            self._browser = None
            self._page = None
