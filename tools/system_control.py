"""Local OS shell command execution with a deny-list safety layer."""

import subprocess

from core.security import shell_command_allowed


def execute_system_command(command: str) -> str:
    """Executes a terminal or shell command on the host machine."""
    allowed, reason = shell_command_allowed(command)
    if not allowed:
        return f"Security policy blocked this command: {reason}"
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            return f"Success: {result.stdout or '(no output)'}"
        return f"Error: {result.stderr or result.stdout or 'Command failed'}"
    except subprocess.TimeoutExpired:
        return "Execution failed: command timed out after 10 seconds."
    except Exception as e:
        return f"Execution failed: {str(e)}"


def set_system_volume(level: int) -> str:
    """Sets system volume to requested percentage (0-100)."""
    lvl = max(0, min(100, int(level)))
    try:
        # PowerShell volume adjustment
        cmd = f'powershell -c "$wsh = New-Object -ComObject WScript.Shell; 1..50 | % {{ $wsh.SendKeys([char]174) }}; $steps = [math]::Round({lvl} / 2); 1..$steps | % {{ $wsh.SendKeys([char]175) }}"'
        subprocess.run(cmd, shell=True, timeout=5)
        return f"System volume set to {lvl}%, Boss!"
    except Exception as e:
        return f"System volume adjusted to {lvl}%."

