---
layout: page
title: High-Throughput Bioreactor Perfusion Systems
description: Microfluidic perfusion bioreactor platforms for high-throughput, long-term cell and tissue culture in standard multiwell plate formats.
img: assets/img/Multilayer perfusion system.png
importance: 2
category: work
giscus_comments: true
---

My work on high-throughput bioreactor systems focuses on developing microfluidic platforms that enable long-term, controlled perfusion culture for scalable biological experiments. By integrating microfluidic channel networks with standard multiwell plate formats, these systems provide continuous nutrient exchange, waste removal, and precise environmental control while maintaining compatibility with conventional laboratory workflows and high-content optical measurements.

Through the development of a microfluidics-enabled 96-well perfusion bioreactor platform, this work demonstrates the ability to support long-term cell and tissue culture with improved viability, stability, and experimental reproducibility compared to static culture conditions. The platform enables high-throughput screening and parallel experimentation while supporting advanced functional readouts such as all-optical electrophysiology and live-cell imaging. By bridging microfluidic engineering with standardized plate-based assays, this technology facilitates scalable tissue engineering, drug screening, and long-term physiological studies in a format readily adoptable by biomedical research laboratories.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/Multilayer perfusion system.png" title="Multilayer perfusion system" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/PDMS Perfusion.png" title="PDMS Perfusion" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/HTuPBR-96well.png" title="HTuPBR-96well" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
**Left to right:** (1) A multilayer PMMA perfusion bioreactor system enabling automated multi-medium switching through integrated fluidic routing; (2) a reusable flexible silicone-rubber perfusion interface designed to seal and perfuse a standard 96-well plate; and (3) a PMMA-based perfusion platform for 96-well plates that allows independent medium conditions to be delivered to each row for parallelized experiments.
</div>

<div class="row justify-content-sm-center">
    <div class="col-sm-6 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/Perfusion.jpg" title="Perfusion" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm-3 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/Evenflow Perfusion.png" title="Evenflow Perfusion" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm-3 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/Evenglow SImulation.png" title="Simulation" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
**Left to right:** (1) Example perfusion test results at a volumetric flow rate of (Q = 0.4) mL min(^{-1}) using the PDMS-based perfusion cover; (2) exploded view of the PMMA-based perfusion cover designed to generate uniform, cell-non-disruptive flow across the culture wells; and (3) COMSOL-based computational fluid dynamics (CFD) simulation illustrating the flow distribution within the perfusion system.
</div>

**Related Publication**

{% bibliography --query @*[key=wei2020PDMS96wellperfusion] %}

{% bibliography --query @*[key=mcleod2023HTuPBR] %}

{% bibliography --query @*[key=mcleod2025HTperfusionPatent] %}
