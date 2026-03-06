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
Left to right: (1) A PDMS microfluidic chip integrated with the MOPICS platform and excited by an oblique light sheet for single-cell hyperspectral measurements; (2) a close-up of the dual-objective orthogonal laser-excitation spectroscopy system used for high-resolution optical detection; and (3) a 96-well plate interrogated by the laser-induced fluorescence (LIF) platform for high-throughput phenotypic assays.
</div>
<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/SWIFTFISH_LIF.png" title="LIF" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
(a) Single-cell-resolution 3 channel laser-induced fluorescence (LIF) detection system with its optical component layout shown. (b) Microfluidic detection chip made of polydimethylsiloxane (PDMS) on a glass cover slip (c) Microfluidic detection chip placed on the LIF system to be detected.
</div>


**Related Publication**

{% bibliography --query @*[key=wei2024swiftfish] %}

{% bibliography --query @*[key=wei2025MDLIF] %}

{% bibliography --query @*[key=li2024SPscChromatography] %}


{% endraw %}
