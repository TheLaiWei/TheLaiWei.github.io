---
layout: page
permalink: /publications/
title: Patent and Publications 
description: Publications by categories in reversed chronological order.
nav: true
nav_order: 2
---

<!-- _pages/publications.md -->

{% include bib_search.liquid %}

<div class="publications">

  <h2>Selected Publications</h2>
  <p>
    <strong>•</strong> First/Co-First Author<br>
    <strong>•</strong> Major platform contributions
  </p>

  {% bibliography --query @*[selected=true] %}

  <hr>
  
  <h2>Patents</h2>

  {%- comment -%}
  Patents can be stored as @patent entries OR @misc entries (fallback).
  Show both. If you only use one, the other query will just return nothing.
  {%- endcomment -%}

  {% bibliography --query @patent* %}
  {% bibliography --query @misc*[abbr~=Patent] %}
  
  <hr>

  <h2>Peer-Reviewed Journal Articles</h2>
  <p>
    <strong>•</strong> All journal publications
  </p>

  {%- comment -%}
  Exclude selected ones to prevent duplicates.
  If you haven't added selected=true yet, this will simply show all articles here.
  {%- endcomment -%}
  {% bibliography --query @article*[selected!=true] %}

  <hr>

  <h2>Conference Proceedings</h2>
  <p>
    <strong>•</strong> SPIE, etc.
  </p>

  {% bibliography --query @inproceedings* %}

</div>
