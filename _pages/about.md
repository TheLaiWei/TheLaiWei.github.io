---
layout: about
title: about
permalink: /
subtitle: Ph.D. Candidate | Johns Hopkins University

profile:
  align: right
  image: IMG_1368.jpg
  image_circular: false # crops the image to make it circular
  more_info: >
      <p><strong>Contact</strong></p>
      <p><a href="mailto:lwei27@jhu.edu">lwei27@jhu.edu</a></p>
      <p>
        <a href="https://scholar.google.com/citations?user=qcJTrn4AAAAJ&hl=en" target="_blank" rel="noopener noreferrer">Scholar</a> |
        <a href="https://www.linkedin.com/in/lai-wei-a61903347/" target="_blank" rel="noopener noreferrer">LinkedIn</a> |
        <a href="/assets/pdf/CV.pdf" target="_blank">CV</a>
      </p>

selected_papers: false # includes a list of papers marked as "selected={true}"
social: false # includes social icons at the bottom of the page

announcements:
  enabled: false # includes a list of news items

latest_posts:
  enabled: false

---


**Lai Wei** is a biomedical and mechanical engineer currently pursuing his Ph.D. in the BioMEMS & Single Molecule Dynamics Laboratory at Johns Hopkins University, led by Dr. Tza-Huei (Jeff) Wang. His doctoral research focuses on the development of advanced **biosensing and medical diagnostic platforms** through the integration of microfluidics, BioMEMS, and optical technologies. In particular, his work aims to enable high-resolution and single-cell analysis for rapid, precise, and quantitative molecular detection. 

Lai Wei received his bachelor’s degree in biomedical engineering from The George Washington University, where he conducted research in the Microfluidics and Biosensors Laboratory under the mentorship of Dr. Zhenyu Li. His undergraduate research centered on **microfluidics-enabled bioreactors** for cardiovascular tissue engineering and biofilm studies.

<br><br><br><br><br><br>

## Publications Section Under Construction {#publications}

<div class="publications">
{% bibliography %}
</div>

<br><br><br>

## Projects Section Under Construction {#projects}

<div class="projects">

{% assign sorted_projects = site.projects | sort: "importance" %}

<div class="row row-cols-1 row-cols-md-3">
  {% for project in sorted_projects %}
    {% include projects.liquid %}
  {% endfor %}
</div>

</div>

<br><br><br>
