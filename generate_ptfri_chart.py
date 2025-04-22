
import matplotlib.pyplot as plt
import numpy as np
import base64
from io import BytesIO

def generate_ptfri_chart():
    # Data
    categories = ['Production', 'Themes', 'Flow', 'Replay', 'Impact']
    scores = [4.0, 4.5, 4.0, 4.0, 4.5]
    scores += scores[:1]  # Close the pentagon

    # Compute angles for each axis
    angles = np.linspace(0, 2 * np.pi, len(categories), endpoint=False).tolist()
    angles += angles[:1]

    # Initialize radar chart
    fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True))
    
    # Customize colors and style
    ax.fill(angles, scores, color='#00f7ff', alpha=0.25)
    ax.plot(angles, scores, color='#00f7ff', linewidth=2)
    
    # Set background color
    ax.set_facecolor('#0a0a0a')
    fig.patch.set_facecolor('#0a0a0a')
    
    # Customize grid and labels
    ax.set_yticks([1, 2, 3, 4, 5])
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(categories, color='white')
    ax.tick_params(colors='white')
    
    # Title
    plt.title("PTFRI Star Matrix: J. Cole - 2014 Forest Hills Drive", size=15, pad=20, color='white')
    
    # Save to base64
    buffer = BytesIO()
    plt.savefig(buffer, format='png', transparent=True)
    buffer.seek(0)
    image_png = buffer.getvalue()
    buffer.close()
    
    return base64.b64encode(image_png).decode()

if __name__ == "__main__":
    chart_data = generate_ptfri_chart()
    print(chart_data)

