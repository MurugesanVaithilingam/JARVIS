/* ================================================================
   J.A.R.V.I.S. Layer 10 — Safety & Permission System (Guardrails)
   🟢 Green: Safe / Auto Execution
   🟡 Yellow: Ask Permission
   🔴 Red: Always Require Confirmation
   ================================================================ */

window.JarvisGuardrails = {
  levels: {
    GREEN: 'GREEN',   // Auto-execute
    YELLOW: 'YELLOW', // Prompt user confirmation
    RED: 'RED'        // High-risk critical override required
  },

  classifyAction(actionName, target = '') {
    const act = actionName.toLowerCase();
    const tgt = target.toLowerCase();

    // 🔴 RED LEVEL (Critical Destructive)
    if (act.includes('delete') || act.includes('drop') || act.includes('kill') || act.includes('remove') || tgt.includes('drop database')) {
      return { level: this.levels.RED, desc: `Critical action detected: ${actionName} on '${target}'` };
    }

    // 🟡 YELLOW LEVEL (Modifications & App Launches)
    if (act.includes('edit') || act.includes('create') || act.includes('launch') || act.includes('write')) {
      return { level: this.levels.YELLOW, desc: `System modification: ${actionName} on '${target}'` };
    }

    // 🟢 GREEN LEVEL (Read / Search / Calculate)
    return { level: this.levels.GREEN, desc: `Safe read action: ${actionName}` };
  },

  async authorize(actionName, target = '') {
    const check = this.classifyAction(actionName, target);

    if (check.level === this.levels.GREEN) {
      return true;
    }

    if (check.level === this.levels.YELLOW) {
      window.JarvisAudio?.playBeep(900, 'triangle', 0.1);
      return confirm(`🟡 JARVIS GUARDRAILS PERMISSION REQUIRED:\n\nAction: ${actionName}\nTarget: ${target}\n\nDo you authorize this system modification?`);
    }

    if (check.level === this.levels.RED) {
      window.JarvisAudio?.playAlarm();
      return confirm(`🔴 CRITICAL GUARDRAIL WARNING 🔴\n\nHigh-Risk Action: ${actionName}\nTarget: ${target}\n\nWARNING: This action may permanently alter or delete data!\nAre you 100% sure you want to proceed?`);
    }

    return false;
  }
};
