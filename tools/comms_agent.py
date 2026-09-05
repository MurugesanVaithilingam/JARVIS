"""WhatsApp / messaging agent — contact resolve + WhatsApp Web / wa.me send."""

from __future__ import annotations

import json
import os
import re
import urllib.parse
import webbrowser
from typing import Any, Dict, List, Optional

CONTACTS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "jarvis_workspace", "contacts.json"
)


def _load_contacts() -> List[Dict[str, Any]]:
    contacts: List[Dict[str, Any]] = []
    if os.path.exists(CONTACTS_PATH):
        with open(CONTACTS_PATH, encoding="utf-8") as handle:
            data = json.load(handle)
            contacts = data.get("contacts") or data if isinstance(data, dict) else data
    env_phone = os.getenv("JARVIS_CONTACT_RAHUL", "").strip()
    if env_phone and not any(c.get("id") == "rahul" for c in contacts):
        contacts.append(
            {
                "id": "rahul",
                "name": "Rahul",
                "aliases": ["rahul", "rahul kumar"],
                "phone": env_phone,
                "whatsapp": True,
            }
        )
    elif env_phone:
        for c in contacts:
            if c.get("id") == "rahul" or "rahul" in (c.get("name") or "").lower():
                c["phone"] = c.get("phone") or env_phone
    return contacts


def resolve_contact(name: str) -> Dict[str, Any]:
    raw_name = (name or "").strip()
    needle = re.sub(r"[^a-z0-9\u0b80-\u0bff]+", "", raw_name.lower())
    if not needle:
        return {"error": "No contact name provided."}

    contacts = _load_contacts()
    matches = []

    # 1. Exact match on ID, name, or alias
    for contact in contacts:
        c_id = str(contact.get("id", "")).lower()
        c_name = str(contact.get("name", "")).lower()
        c_aliases = [str(a).lower() for a in contact.get("aliases") or []]
        if needle == c_id or needle == c_name or needle in c_aliases:
            matches.append(contact)

    # 2. Substring match fallback
    if not matches:
        for contact in contacts:
            blob = " ".join(
                [str(contact.get("id", "")), str(contact.get("name", ""))]
                + list(contact.get("aliases") or [])
            ).lower()
            blob_flat = re.sub(r"[^a-z0-9\u0b80-\u0bff]+", "", blob)
            if needle in blob_flat:
                matches.append(contact)

    if len(matches) > 1:
        names = ", ".join(m.get("name", "?") for m in matches)
        return {"error": f"Multiple contacts matched. Choose one: {names}", "matches": matches}
    if not matches:
        return {"error": f"No contact found for '{raw_name}'. Add them in contacts.json."}

    contact = matches[0]
    phone = re.sub(r"\D", "", str(contact.get("phone") or ""))
    contact = dict(contact)
    contact["phone"] = phone
    return contact


def _urls(phone: str, message: str) -> Dict[str, str]:
    text = urllib.parse.quote(message)
    return {
        "wa_me": f"https://wa.me/{phone}?text={text}",
        "web": f"https://web.whatsapp.com/send?phone={phone}&text={text}",
    }


async def make_phone_call(contact_name: str) -> str:
    contact = resolve_contact(contact_name)
    if contact.get("error"):
        return contact["error"]
    phone = contact.get("phone") or ""
    name = contact.get("name") or contact_name
    call_url = f"https://web.whatsapp.com"
    try:
        webbrowser.open(call_url)
    except Exception:
        pass
    if phone:
        return f"Initiating call to {name} ({phone}) via WhatsApp / Phone. Opening WhatsApp Web..."
    return f"Initiating call to {name} via WhatsApp Web / Phone..."


async def send_whatsapp_message(contact_name: str, message: str) -> str:
    contact = resolve_contact(contact_name)
    if contact.get("error"):
        return contact["error"]
    phone = contact["phone"]
    text = (message or "Hi").strip() or "Hi"
    urls = _urls(phone, text)
    try:
        webbrowser.open(urls["web"])
    except Exception:
        webbrowser.open(urls["wa_me"])

    clicked = False
    try:
        from tools_v1.browser import BrowserController

        browser = BrowserController(headless=False)
        await browser.open_url(urls["web"])
        if browser._page:
            for selector in (
                'button[aria-label="Send"]',
                'button[aria-label="Send message"]',
                'span[data-icon="send"]',
                'span[data-icon="wds-ic-send-filled"]',
            ):
                try:
                    await browser._page.wait_for_selector(selector, timeout=25000)
                    await browser._page.click(selector)
                    clicked = True
                    break
                except Exception:
                    continue
    except Exception:
        clicked = False

    if clicked:
        return f"Sent '{text}' to {contact.get('name')} on WhatsApp."
    return (
        f"WhatsApp message composed for {contact.get('name')}: '{text}'. "
        f"WhatsApp Web launched."
    )


def list_contacts() -> List[Dict[str, str]]:
    out = []
    for c in _load_contacts():
        phone = re.sub(r"\D", "", str(c.get("phone") or ""))
        masked = ("*" * max(0, len(phone) - 4)) + phone[-4:] if phone else ""
        out.append({"id" : str(c.get("id", "")), "name": str(c.get("name", "")), "phone_masked": masked})
    return out

