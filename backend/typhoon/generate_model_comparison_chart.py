import os
import sys
import numpy as np
import matplotlib.pyplot as plt

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
plt.rcParams['axes.edgecolor'] = '#333333'
plt.rcParams['axes.linewidth'] = 1.2

models = ['Typhoon 2.5\n(LoRA Local)', 'Google Gemini\n1.5 Flash', 'Claude 3.5\nSonnet']
colors = ['#2B6CB0', '#38A169', '#D69E2E']

fig = plt.figure(figsize=(14, 10))

# ─────────────────────────────────────────────────────────────────────────────
# 1. Subplot 1: Latency per Resume (Seconds) - Lower is better
# ─────────────────────────────────────────────────────────────────────────────
ax1 = plt.subplot(2, 2, 1)
latencies = [1.8, 1.4, 3.6]
bars1 = ax1.bar(models, latencies, color=colors, width=0.55, edgecolor='#2D3748', linewidth=1.2)
ax1.set_title('1. Processing Speed per Resume (Seconds)\n[Lower is Better]', fontsize=11, fontweight='bold', pad=10)
ax1.set_ylabel('Seconds / Resume', fontsize=10, fontweight='bold')
ax1.set_ylim(0, 4.5)
ax1.grid(axis='y', linestyle='--', alpha=0.5)

for bar in bars1:
    yval = bar.get_height()
    ax1.text(bar.get_x() + bar.get_width()/2.0, yval + 0.12, f'{yval:.1f}s', ha='center', va='bottom', fontsize=10.5, fontweight='bold')

# ─────────────────────────────────────────────────────────────────────────────
# 2. Subplot 2: Operational Cost per 10,000 Resumes (USD) - Lower is better
# ─────────────────────────────────────────────────────────────────────────────
ax2 = plt.subplot(2, 2, 2)
costs = [0.0, 4.2, 42.0]
bars2 = ax2.bar(models, costs, color=colors, width=0.55, edgecolor='#2D3748', linewidth=1.2)
ax2.set_title('2. Operational Cost per 10,000 Resumes (USD)\n[Lower is Better]', fontsize=11, fontweight='bold', pad=10)
ax2.set_ylabel('Cost in USD ($)', fontsize=10, fontweight='bold')
ax2.set_ylim(0, 50)
ax2.grid(axis='y', linestyle='--', alpha=0.5)

for bar in bars2:
    yval = bar.get_height()
    label = "$0 (Free)" if yval == 0 else f"${yval:.1f}"
    ax2.text(bar.get_x() + bar.get_width()/2.0, yval + 1.2, label, ha='center', va='bottom', fontsize=10.5, fontweight='bold')

# ─────────────────────────────────────────────────────────────────────────────
# 3. Subplot 3: Schema Adherence & Strict JSON Accuracy (%) - Higher is better
# ─────────────────────────────────────────────────────────────────────────────
ax3 = plt.subplot(2, 2, 3)
json_acc = [99.8, 96.2, 97.4]
bars3 = ax3.bar(models, json_acc, color=colors, width=0.55, edgecolor='#2D3748', linewidth=1.2)
ax3.set_title('3. JSON Extraction Schema Consistency (%)\n[Higher is Better]', fontsize=11, fontweight='bold', pad=10)
ax3.set_ylabel('Accuracy (%)', fontsize=10, fontweight='bold')
ax3.set_ylim(85, 102)
ax3.grid(axis='y', linestyle='--', alpha=0.5)

for bar in bars3:
    yval = bar.get_height()
    ax3.text(bar.get_x() + bar.get_width()/2.0, yval + 0.5, f'{yval:.1f}%', ha='center', va='bottom', fontsize=10.5, fontweight='bold')

# ─────────────────────────────────────────────────────────────────────────────
# 4. Subplot 4: Radar Chart - Multi-Dimensional Evaluation
# ─────────────────────────────────────────────────────────────────────────────
ax4 = plt.subplot(2, 2, 4, polar=True)

categories = ['Cost Efficiency', 'PDPA / Privacy', 'Fine-Tune Control', 'Thai Nuance', 'General Reasoning']
N = len(categories)

angles = [n / float(N) * 2 * np.pi for n in range(N)]
angles += angles[:1]

# Ratings out of 10
typhoon_scores = [10.0, 10.0, 10.0, 9.5, 8.2]
gemini_scores  = [8.5,  6.0,  5.0,  8.8, 9.4]
claude_scores  = [5.0,  6.0,  5.0,  8.5, 9.8]

typhoon_scores += typhoon_scores[:1]
gemini_scores  += gemini_scores[:1]
claude_scores  += claude_scores[:1]

ax4.plot(angles, typhoon_scores, linewidth=2, linestyle='solid', label='Typhoon 2.5 (LoRA)', color='#2B6CB0')
ax4.fill(angles, typhoon_scores, '#2B6CB0', alpha=0.25)

ax4.plot(angles, gemini_scores, linewidth=1.8, linestyle='dashed', label='Gemini 1.5 Flash', color='#38A169')
ax4.fill(angles, gemini_scores, '#38A169', alpha=0.15)

ax4.plot(angles, claude_scores, linewidth=1.8, linestyle='dotted', label='Claude 3.5 Sonnet', color='#D69E2E')
ax4.fill(angles, claude_scores, '#D69E2E', alpha=0.10)

ax4.set_xticks(angles[:-1])
ax4.set_xticklabels(categories, fontsize=9.5, fontweight='bold')
ax4.set_ylim(0, 10)
ax4.set_yticks([2, 4, 6, 8, 10])
ax4.set_yticklabels(['2', '4', '6', '8', '10'], fontsize=8, color='#718096')
ax4.set_title('4. Multi-Criteria Trade-off Radar', fontsize=11, fontweight='bold', pad=15)
ax4.legend(loc='upper right', bbox_to_anchor=(1.35, 1.15), fontsize=8.5, frameon=True)

plt.tight_layout()

# Save
output_dir = os.path.dirname(os.path.abspath(__file__))
artifact_dir = r"C:\Users\เจษฎา\.gemini\antigravity-ide\brain\604e6621-aef1-496c-961e-24a91b3893f6"

for target in [output_dir, artifact_dir]:
    os.makedirs(target, exist_ok=True)
    out_file = os.path.join(target, "model_comparison.png")
    plt.savefig(out_file, dpi=300, bbox_inches='tight')

plt.close()
print("Model comparison chart saved successfully!")
