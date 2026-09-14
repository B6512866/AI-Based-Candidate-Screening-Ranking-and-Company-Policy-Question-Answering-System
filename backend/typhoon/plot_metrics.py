import os
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

# Data extracted from SFTTrainer logs
steps = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
epochs = [0.0082, 0.0164, 0.0246, 0.0328, 0.0410, 0.0492, 0.0574, 0.0656, 0.0738, 0.0820]
loss = [4.212, 0.9756, 0.3803, 0.3659, 0.3262, 0.1133, 0.001179, 0.0002818, 0.000185, 0.0001763]
learning_rate = [0.00018, 0.00018, 0.0001578, 0.0001356, 0.0001133, 0.00009111, 0.00006889, 0.00004667, 0.00002444, 0.000002222]
accuracy = [37.66, 82.18, 96.77, 96.77, 96.77, 98.71, 100.0, 100.0, 100.0, 100.0]

# Set dark modern styling
plt.style.use('seaborn-v0_8-darkgrid' if 'seaborn-v0_8-darkgrid' in plt.style.available else 'default')
fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(10, 12), sharex=True)

# 1. Plot Loss
ax1.plot(steps, loss, marker='o', color='#E63946', linewidth=2.5, markersize=7, label='Training Loss')
ax1.set_title('Typhoon 2.5 Fine-Tuning: Loss Progression', fontsize=14, fontweight='bold', pad=10)
ax1.set_ylabel('Loss', fontsize=11, fontweight='bold')
ax1.set_yscale('log') # Log scale to highlight tiny final loss values
ax1.grid(True, linestyle='--', alpha=0.6)
for x, y in zip(steps[::3], loss[::3]):
    ax1.annotate(f"{y:.4f}", (x, y), textcoords="offset points", xytext=(0,10), ha='center', fontsize=9, fontweight='bold', color='#E63946')

# 2. Plot Learning Rate
ax2.plot(steps, learning_rate, marker='s', color='#457B9D', linewidth=2.5, markersize=7, label='Learning Rate')
ax2.set_title('Learning Rate Schedule (Linear Decay)', fontsize=14, fontweight='bold', pad=10)
ax2.set_ylabel('Learning Rate', fontsize=11, fontweight='bold')
ax2.yaxis.set_major_formatter(ticker.FormatStrFormatter('%.1e'))
ax2.grid(True, linestyle='--', alpha=0.6)

# 3. Plot Mean Token Accuracy
ax3.plot(steps, accuracy, marker='^', color='#2A9D8F', linewidth=2.5, markersize=7, label='Token Accuracy (%)')
ax3.set_title('Mean Token Accuracy (%) vs Steps', fontsize=14, fontweight='bold', pad=10)
ax3.set_xlabel('Training Steps (100 Steps Total)', fontsize=12, fontweight='bold')
ax3.set_ylabel('Accuracy (%)', fontsize=11, fontweight='bold')
ax3.set_ylim(30, 105)
ax3.grid(True, linestyle='--', alpha=0.6)

# Add Secondary X-axis on top for Epochs
ax_top = ax1.twiny()
ax_top.set_xlim(ax1.get_xlim())
ax_top.set_xticks(steps[::2])
ax_top.set_xticklabels([f"Epoch {e:.3f}" for e in epochs[::2]], fontsize=10, fontweight='bold', color='#1D3557')

plt.tight_layout()

# Save image in local directory and artifact directory
artifact_dir = r"C:\Users\เจษฎา\.gemini\antigravity-ide\brain\604e6621-aef1-496c-961e-24a91b3893f6"
os.makedirs(artifact_dir, exist_ok=True)

target_path_artifact = os.path.join(artifact_dir, "training_metrics.png")
target_path_local    = os.path.join(os.path.dirname(os.path.abspath(__file__)), "training_metrics.png")

plt.savefig(target_path_artifact, dpi=300, bbox_inches='tight')
plt.savefig(target_path_local, dpi=300, bbox_inches='tight')
print("Charts generated and saved successfully!")
