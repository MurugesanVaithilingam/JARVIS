"""Unit tests for JARVIS Voice Recognition, Multi-turn Context Memory, and Tool Calling Engine."""

import asyncio
import sys
from core.logger import init_db
from core.security import Principal
from core.command_router import route_command
from tools.comms_agent import resolve_contact


async def run_tests():
    init_db()
    admin = Principal(True, "Boss", 6, "master")

    print("==================================================")
    print("RUNNING JARVIS VOICE & MULTI-TURN ENGINE TESTS")
    print("==================================================")

    # 1. Contact Resolution Test
    print("\n--- 1. Contact Resolution Tests ---")
    c1 = resolve_contact("Arun")
    print("Resolve 'Arun':", c1.get("name"), c1.get("phone"))
    assert c1.get("name") == "Arun", f"Failed: {c1}"

    c2 = resolve_contact("அருண்")
    print("Resolve Tamil 'அருண்':", c2.get("name"), c2.get("phone"))
    assert c2.get("name") == "Arun", f"Failed: {c2}"

    c3 = resolve_contact("Amma")
    print("Resolve 'Amma':", c3.get("name"), c3.get("phone"))
    assert c3.get("name") == "Amma", f"Failed: {c3}"

    # 2. Fast Commands Test
    print("\n--- 2. Fast Commands Tests ---")
    r_open = await route_command("WhatsApp open பண்ணு", principal=admin)
    print("Fast 'WhatsApp open பண்ணு':", r_open.get("intent"), "->", r_open.get("reply"))
    assert r_open.get("intent") in ["OPEN_APP", "OPEN_CHROME"], f"Failed: {r_open}"

    r_vol = await route_command("Volume 50%", principal=admin)
    print("Fast 'Volume 50%':", r_vol.get("intent"), "->", r_vol.get("reply"))
    assert r_vol.get("intent") == "FAST_VOLUME", f"Failed: {r_vol}"

    r_time = await route_command("என்ன நேரம்", principal=admin)
    print("Fast 'என்ன நேரம்':", r_time.get("intent"), "->", r_time.get("reply"))
    assert r_time.get("intent") == "FAST_TIME", f"Failed: {r_time}"

    # 3. Call Intent Test
    print("\n--- 3. Call Intent Test ---")
    r_call = await route_command("Arun-ku call pannu", principal=admin, confirmed=True)
    print("Call 'Arun-ku call pannu':", r_call.get("intent"), "->", r_call.get("reply"))
    assert r_call.get("intent") == "MAKE_CALL", f"Failed: {r_call}"

    # 4. Multi-turn Slot Filling Test
    print("\n--- 4. Multi-turn Slot Filling Test ---")
    # Step A: Missing message
    r_slot1 = await route_command("Arun-ku message anuppu", principal=admin, confirmed=True)
    print("Turn 1 'Arun-ku message anuppu':", r_slot1.get("intent"), "| followup:", r_slot1.get("requires_followup"), "->", r_slot1.get("reply"))
    assert r_slot1.get("requires_followup") is True, f"Failed: {r_slot1}"

    # Step B: Follow-up message provided
    r_slot2 = await route_command("naalaikku 10 manikku meeting irukku", principal=admin, confirmed=True)
    print("Turn 2 'naalaikku 10 manikku meeting irukku':", r_slot2.get("intent"), "->", r_slot2.get("reply"))
    assert r_slot2.get("intent") == "SEND_WHATSAPP", f"Failed: {r_slot2}"
    assert "Arun" in r_slot2.get("reply"), f"Failed target: {r_slot2}"

    # 5. Direct WhatsApp Message Test
    print("\n--- 5. Direct WhatsApp Message Test ---")
    r_direct = await route_command("Arun-ku WhatsApp-la 'naan 10 manikku varen' nnu message anuppu", principal=admin, confirmed=True)
    print("Direct WhatsApp message:", r_direct.get("intent"), "->", r_direct.get("reply"))
    assert r_direct.get("intent") == "SEND_WHATSAPP", f"Failed: {r_direct}"

    print("\n==================================================")
    print("✅ ALL JARVIS VOICE & TOOL ENGINE TESTS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(run_tests())
