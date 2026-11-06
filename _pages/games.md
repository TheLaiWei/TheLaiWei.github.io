---
layout: page
title: Games
permalink: /games/
nav: true
nav_order: 4
---

<div class="row">
{% for game in site.data.games %}
  <div class="col-md-6 mb-3">
    <a href="{{ game.url | relative_url }}" class="card h-100 hoverable">
      <div class="card-body">
        <h2 class="h4 card-title">{{ game.title | escape }}</h2>
        <p class="card-text">{{ game.description | escape }}</p>
      </div>
    </a>
  </div>
{% endfor %}
</div>
