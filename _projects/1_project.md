---
layout: page
title: Biomedical Photonics
description: Laser-based hyperspectral optical systems for rapid microbial diagnostics.
img: assets/img/SWIFTFISH-LIF.png
importance: 1
category: work
related_publications: true
---

My Biomedical Photonics related research lies at the intersection of biomedical engineering and photonics, where I develop advanced optical biosensing platforms for rapid, single-cell microbial analysis. By integrating multi-wavelength laser excitation, light-sheet illumination, and hyperspectral fluorescence detection with microfluidic control, I engineer systems capable of resolving molecular, metabolic, and structural signatures at the single-bacterium level. My work focuses on optimizing optical geometries, spectral separation strategies, detector configurations (e.g., APDs and spectrometers), and signal-to-noise performance to enable sensitive, wash-free molecular assays and rapid phenotypic characterization.

Through platforms such as Multiparametric Oblique-Plane Illumination Confocal Spectroscopy (MOPICS) and single cell resoultion multi-channel Laser Induced Fluorescent (LIF) detection system, I aim to accelerate pathogen identification and antimicrobial susceptibility testing directly from clinical samples. By combining photonic instrumentation design with molecular probe chemistry and microfluidic engineering, my research advances real-time, high-content optical diagnostics that bridge fundamental biophotonics and translational medical applications.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/PDMSMOPICS.png" title="PDMS on MOPICS" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/SideExcitation.png" title="SideExcitation" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/96well_excitation.png" title="96well_excitation" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Caption photos easily. On the left, a road goes through a tunnel. Middle, leaves artistically fall in a hipster photoshoot. Right, in another hipster photoshoot, a lumberjack grasps a handful of pine needles.
</div>
<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/SWIFTFISH_LIF.png" title="LIF" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
(a) Single-cell-resolution 3 channel laser-induced fluorescence (LIF) detection system with its optical component layout shown. (b) Microfluidic detection chip made of polydimethylsiloxane (PDMS) on a glass cover slip (c) Microfluidic detection chip placed on the LIF system to be detected.
</div>

You can also put regular text between your rows of images, even citations {% cite einstein1950meaning %}.
Say you wanted to write a bit about your project before you posted the rest of the images.
You describe how you toiled, sweated, _bled_ for your project, and then... you reveal its glory in the next row of images.

<div class="row justify-content-sm-center">
    <div class="col-sm-8 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/6.jpg" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm-4 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/11.jpg" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    You can also have artistically styled 2/3 + 1/3 images, like these.
</div>

The code is simple.
Just wrap your images with `<div class="col-sm">` and place them inside `<div class="row">` (read more about the <a href="https://getbootstrap.com/docs/4.4/layout/grid/">Bootstrap Grid</a> system).
To make images responsive, add `img-fluid` class to each; for rounded corners and shadows use `rounded` and `z-depth-1` classes.
Here's the code for the last row of images above:

{% raw %}

```html
<div class="row justify-content-sm-center">
  <div class="col-sm-8 mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/6.jpg" title="example image" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm-4 mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/11.jpg" title="example image" class="img-fluid rounded z-depth-1" %}
  </div>
</div>
```

{% endraw %}
