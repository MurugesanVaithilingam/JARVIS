"""JARVIS V1 — Reliable voice pipeline state machine."""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Optional

logger = logging.getLogger("JarvisVoiceState")


class VoiceState(str, Enum):
    IDLE = "IDLE"
    LISTENING = "LISTENING"
    PROCESSING = "PROCESSING"
    SPEAKING = "SPEAKING"
    ERROR = "ERROR"


@dataclass
class VoiceStateMachine:
    """Thread-safe voice state with guaranteed transition logging."""

    _state: VoiceState = VoiceState.IDLE
    _lock: threading.Lock = field(default_factory=threading.Lock)
    _last_transition: float = field(default_factory=time.time)
    _on_change: Optional[Callable[[VoiceState, VoiceState], None]] = None

    @property
    def current(self) -> VoiceState:
        return self._state

    def set(self, new_state: VoiceState) -> VoiceState:
        with self._lock:
            old = self._state
            if old == new_state:
                return old
            self._state = new_state
            self._last_transition = time.time()
            logger.info("Voice state: %s → %s", old.value, new_state.value)
            if self._on_change:
                try:
                    self._on_change(old, new_state)
                except Exception as exc:
                    logger.warning("State change callback error: %s", exc)
            return new_state

    def can_listen(self) -> bool:
        return self._state in (VoiceState.IDLE, VoiceState.LISTENING)

    def can_process(self) -> bool:
        return self._state in (VoiceState.LISTENING, VoiceState.IDLE)

    def can_speak(self) -> bool:
        return self._state in (VoiceState.PROCESSING, VoiceState.LISTENING, VoiceState.IDLE)

    def age_ms(self) -> float:
        return (time.time() - self._last_transition) * 1000

    def snapshot(self) -> dict:
        return {
            "state": self._state.value,
            "age_ms": round(self.age_ms(), 1),
            "can_listen": self.can_listen(),
            "can_process": self.can_process(),
        }
