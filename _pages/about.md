---
layout: about
title:
permalink: /
subtitle: Ph.D. Candidate | Johns Hopkins University

profile:
  align: right
  image: IMG_1368.jpg
  image_circular: false
  more_info: >
    <p>Clark Hall 207</p>
    <p>3400 N. Charles St</p>
    <p>Baltimore, MD 21218</p>

selected_papers: false
social: false

announcements:
  enabled: false

latest_posts:
  enabled: false
---

---

## About

**Lai Wei** is a biomedical and mechanical engineer currently pursuing his Ph.D. in the BioMEMS & Single Molecule Dynamics Laboratory at Johns Hopkins University, led by Dr. Tza-Huei (Jeff) Wang. His doctoral research focuses on the development of advanced **biosensing and medical diagnostic platforms** through the integration of microfluidics, BioMEMS, and optical technologies. In particular, his work aims to enable high-resolution and single-cell analysis for rapid, precise, and quantitative molecular detection.

Lai Wei received his bachelor’s degree in biomedical engineering from The George Washington University, where he conducted research in the Microfluidics and Biosensors Laboratory under the mentorship of Dr. Zhenyu Li. His undergraduate research centered on **microfluidics-enabled bioreactors** for cardiovascular tissue engineering and biofilm studies.

His technical expertise centers on **laser optics system design and construction**, **microfluidics and microfabrication**, and advanced **3D CAD (Fusion and SolidWorks)**. He has hands-on experience in optical system integration, computational fluid dynamics (CFD), wet-laboratory experimentation, and clinical sample handling in translational research environments. By combining optical instrumentation with microscale bioengineering, he designs and implements integrated platforms for quantitative molecular and single-cell diagnostics.

---

## Publications {#publications}

<div class="publications">
{% bibliography %}
</div>

---

## Projects {#projects}

<div class="projects">

{% assign sorted_projects = site.projects | sort: "importance" %}

<div class="row row-cols-1 row-cols-md-3">
  {% for project in sorted_projects %}
    {% include projects.liquid %}
  {% endfor %}
</div>

</div>
