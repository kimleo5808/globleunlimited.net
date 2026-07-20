---
title: "How to Guess Any Capital City in Under 6 Tries"
description: "We measured all 199 world capitals against each other to find the best opening city, the clusters that eat guesses, and why capitals break ordinary distance logic."
date: 2026-07-20
tags: ["globle capitals", "capital cities", "data study"]
cover: "/blog/guess-any-capital-city/cover.svg"
coverAlt: "Atlas-style illustration of a globe scattered with capital-city markers, densest across Europe, titled How to Guess Any Capital City"
---

**Guessing a capital is not the same problem as guessing a country, and most players lose guesses because they treat it as one.** A country is an area. A capital is a single point — and that point is frequently nowhere near the middle of the country it belongs to.

We measured every one of the 199 capitals in our dataset against every other one: 19,701 city pairs, scored with the same great-circle distance the game uses. This is what fell out.

**What you'll learn**

- Why Madrid is the strongest opening capital and Monrovia is the weakest
- The European cluster that hides 12 capitals inside a single colour shade
- The seven capitals that sit more than 1,000 km from their own country's centre
- A six-guess method that works whether or not you know the answer

## Why Capitals Are Harder Than Countries

The country game gives you a target with width. Guess a neighbour of the answer and you land in the hottest band almost automatically, because the two centroids are close.

Capitals remove that cushion.

### A city is a point, a country is an area

When Globle scores a country guess, it measures centre to centre. Large countries therefore have large catchment: guess anything near Russia's middle and the reading is generous.

Capitals have no catchment. Two capitals 300 km apart read as two different answers, and 300 km is a rounding error on a scale that runs to 12,000.

### The capital is often nowhere near the middle

This is the part that catches experienced country players. You have learned where a country *is*. That knowledge actively misleads you about where its capital is.

Twelve capitals in the dataset sit more than 800 km from their own country's geographic centre:

| Capital | Country | Distance from country centre |
|---|---|---|
| Moscow | Russia | 3,206 km |
| Ottawa | Canada | 2,081 km |
| Washington, D.C. | United States | 1,865 km |
| Canberra | Australia | 1,784 km |
| Kuala Lumpur | Malaysia | 1,442 km |
| Beijing | China | 1,183 km |
| Jakarta | Indonesia | 1,035 km |
| Maputo | Mozambique | 1,025 km |
| Algiers | Algeria | 966 km |
| Kinshasa | DR Congo | 932 km |
| Niamey | Niger | 877 km |
| Cape Town | South Africa | 846 km |

#### The worst offender is Moscow

Russia's centroid sits deep in Siberia. Moscow sits in the far west, 3,206 km away — further than London is from Moscow itself.

If you guess Moscow while picturing "Russia, the big one in the middle-north," every distance you read afterwards will be wrong by roughly the width of Europe.

> 📝 **Note:** this cuts both ways. When the *answer* is Moscow, guesses from Europe run much hotter than your mental map of Russia predicts. Trust the number, not the country.

## The Best Opening Capital, Measured

![Bar chart of the best and worst opening capitals, Madrid at 26 candidates left and Monrovia at 56](/blog/guess-any-capital-city/fig-1-best-openers.svg)

*Plate 1 - worst-case candidates left after one opening capital.*

An opening guess is good when its distance reading splits the field finely — when few other candidates share that same reading.

### How we ranked all 199

For every possible opening capital, we asked: across all 198 possible answers, what is the *worst case* number of other capitals sharing the answer's distance reading, within a 500 km tolerance?

Lower is better. A low score means that whatever the answer turns out to be, that opener never leaves you with a huge undifferentiated pile.

### The top openers

| Rank | Capital | Country | Worst case left |
|---|---|---|---|
| 1 | Madrid | Spain | 26 |
| 2 | Riga | Latvia | 27 |
| 3 | Helsinki | Finland | 28 |
| 4 | Tallinn | Estonia | 28 |
| 5 | Andorra la Vella | Andorra | 29 |
| 6 | Paramaribo | Suriname | 29 |
| 7 | Stockholm | Sweden | 29 |
| 8 | Wellington | New Zealand | 29 |

And the openers to avoid:

| Capital | Country | Worst case left |
|---|---|---|
| Monrovia | Liberia | 56 |
| Majuro | Marshall Islands | 53 |
| Freetown | Sierra Leone | 52 |
| Abidjan | Ivory Coast | 51 |

**Madrid leaves you at most 26 candidates. Monrovia leaves you 56.** Opening badly can cost you more than double the remaining field before you have done anything else wrong.

#### Why a central capital beats a famous one

Notice what is *not* on the winners list: London, Paris, Rome, Cairo. Those sit inside the densest part of the capital map, so their distance readings collide constantly with each other.

Madrid works because it hangs off the western edge of the European cluster. It is close enough to Europe to separate European capitals from one another, far enough west that Africa and the Americas resolve cleanly too.

#### Wellington is the interesting outlier

New Zealand is the least central country on Earth, and we have argued before that [it makes a poor opening country](/blog/best-globle-starting-country). Yet Wellington ranks eighth among capitals.

The difference is that capitals cluster far more tightly than countries do. From an extreme corner, a country opener collapses everything into one cold band. A capital opener from the same corner still separates the Pacific from Asia from Europe, because the clusters are compact enough to sit at genuinely different distances.

## The Clusters That Eat Your Guesses

![Bar chart showing Belgrade has 12 other capitals within 500 km](/blog/guess-any-capital-city/fig-2-clusters.svg)

*Plate 2 - the Balkans are the densest capital region on Earth.*

Capitals are not spread evenly. They pile up wherever small countries pile up, and each pile is a trap.

### Europe: twelve capitals inside 500 km of Belgrade

The Balkans are the densest capital region on Earth.

| Capital | Other capitals within 500 km |
|---|---|
| Belgrade | 12 |
| Ljubljana | 11 |
| Sarajevo | 11 |
| Zagreb | 9 |
| Skopje | 8 |
| Bratislava | 7 |
| Budapest | 7 |
| Podgorica | 7 |

Twelve capitals inside 500 km means twelve capitals that will read as almost exactly the same colour from anywhere outside the region.

### The Caribbean cluster

Castries and Kingstown each have seven capitals within 500 km. The eastern Caribbean packs a dozen sovereign states into an arc shorter than the drive from London to Rome.

#### Reading 200 km differences on the colour ramp

Inside a cluster, colour stops helping. The [heat scale](/how-to-play) spans 12,000 km across five stops, which works out at 3,000 km per segment — so a 200 km difference is under 7% of one segment.

You will not see it. Once you know you are in a cluster, stop reading colour and start guessing cluster members directly.

## The Isolated Capitals Are Free Wins

![Bar chart of the most isolated capitals, Canberra and Wellington each 2,326 km from the nearest other capital](/blog/guess-any-capital-city/fig-4-isolated.svg)

*Plate 4 - one warm reading identifies these outright.*

The opposite of a cluster is a capital with nothing near it. These are the easiest answers in the game, because a single warm reading identifies them outright.

| Capital | Country | Distance to nearest other capital |
|---|---|---|
| Canberra | Australia | 2,326 km |
| Wellington | New Zealand | 2,326 km |
| Dili | East Timor | 1,905 km |
| Melekeok | Palau | 1,686 km |
| Reykjavík | Iceland | 1,495 km |
| Brasília | Brazil | 1,462 km |
| Palikir | Micronesia | 1,460 km |
| Port Moresby | Papua New Guinea | 1,399 km |

Canberra and Wellington are each other's nearest capital, 2,326 km apart. Nothing else is close to either.

**If a reading points into the South Pacific and there is no cluster nearby, you have a two-way guess at worst.**

## Capitals That Aren't the Biggest City

![Bar chart of capitals furthest from their country centroid, led by Moscow at 3,206 km](/blog/guess-any-capital-city/fig-3-offset.svg)

*Plate 3 - where country knowledge misleads you.*

A large share of wrong guesses are not geography errors at all. They are cases where the famous city and the official capital are different places.

### The classic swaps

| Country | Biggest city | Actual capital | Apart |
|---|---|---|---|
| Australia | Sydney | Canberra | ~250 km |
| Turkey | Istanbul | Ankara | ~350 km |
| Brazil | São Paulo | Brasília | ~870 km |
| United States | New York | Washington, D.C. | ~330 km |
| Switzerland | Zürich | Bern | ~95 km |
| Myanmar | Yangon | Naypyidaw | ~320 km |
| Ivory Coast | Abidjan | Yamoussoukro | ~230 km |
| Nigeria | Lagos | Abuja | ~530 km |

### Why the distances matter more than the trivia

Everyone knows Canberra is the capital of Australia. The point is what the 250 km does to your reading.

On a ramp where one colour segment covers 3,000 km, 250 km is invisible — so that swap costs you nothing. But Brasília sits 870 km from São Paulo and Abuja 530 km from Lagos, and those *are* enough to shift the shade you see.

#### The rule of thumb

Under roughly 300 km, guessing the wrong city of the right country still gets you a usable reading. Over 500 km, it does not. Brazil and Nigeria are the two you have to get exactly right.

## What One Opening Guess Actually Buys You

![Grouped bars showing 140 of 198 capitals fall in one band from Wellington](/blog/guess-any-capital-city/fig-5-band-split.svg)

*Plate 5 - a corner opener wastes most of the scale.*

It is worth seeing how unevenly the field splits depending on where you open. Here is how the 198 other capitals distribute across the five colour bands from three different openers.

| Band | From Athens | From Cairo | From Wellington |
|---|---|---|---|
| Deep red | 65 | 58 | 4 |
| Red | 52 | 65 | 7 |
| Orange | 38 | 23 | 7 |
| Amber | 30 | 35 | 40 |
| Pale yellow | 13 | 17 | **140** |

**From Wellington, 140 of 198 capitals — 71% — land in the same pale-yellow band.** That single guess tells you almost nothing, because seven capitals in ten produce an identical colour.

Athens and Cairo spread the field across all five bands. That is what a working opening guess looks like.

#### Read this as a warning about corner openers

The Wellington column is what "ruling out the Pacific" actually costs. You spend a full guess to learn that the answer is one of 140 things.

Compare it to the [same test on countries](/blog/best-globle-starting-country), where a New Zealand opener puts 74% of the world into one shade. The pattern holds in both games.

## A Six-Guess Method That Works Every Time

The method is the same shape as [country strategy](/blog/globle-tips-strategy), but the cluster problem changes what each guess is for.

### Guesses 1–2: lock the region

Open with Madrid. Read the band.

Follow with a capital roughly 90 degrees away on the globe — Nairobi, Jakarta or Lima, depending on where the first reading pointed. Two widely separated readings intersect in a small lens.

### Guesses 3–4: split the cluster

By now you know the region. The question is which member of it.

Guess the capital nearest the *middle* of your candidate cluster, not the most famous one. In the Balkans, that means Belgrade or Sarajevo rather than Athens or Vienna.

### Guesses 5–6: commit

Inside a cluster the colour differences are unreadable, so stop trying to read them. Work through the members in order of how likely they are to be chosen — which in practice means largest and best known first.

#### The mistake that costs a whole guess

Do not re-guess a capital adjacent to one you have already tried. Two capitals 100 km apart give you nearly the same reading, and you have spent a turn learning nothing.

Jump at least 500 km every time, until you are certain you are in the final cluster.

## Common Mistakes

**Guessing the largest city instead of the capital.** Sydney is not Canberra. Istanbul is not Ankara. Rio is not Brasília. In every one of those cases the offset is hundreds of kilometres, which is enough to change the band you read.

**Trusting your country map.** Learned where Canada is? Ottawa is 2,081 km from that mental centre.

**Opening with a famous capital.** London and Paris sit in the middle of the densest cluster on the map. They tell you very little that Madrid does not tell you better.

**Reading colour inside a cluster.** Below roughly 500 km, the ramp cannot resolve the difference. Switch from measuring to enumerating.

## What This Study Can't Tell You

Three limits worth stating plainly.

**It assumes you read colour perfectly.** The 500 km tolerance is a stand-in for human colour perception. Read the ramp more coarsely and the clusters get worse, not better — Madrid's advantage over Monrovia widens rather than narrows.

**It ignores which capitals are actually likely.** Every one of the 199 is treated as equally probable. In practice you will meet Paris more often than Melekeok, simply because you recognise it faster and commit sooner.

**It says nothing about spelling.** Ouagadougou, Nuku'alofa and Yamoussoukro are solved-then-lost problems for a lot of players, and no distance metric captures that.

None of the three changes the ranking. They change how much the ranking is worth on any single round.

## Frequently Asked Questions

<details>
<summary>What is the best opening capital in a capital-guessing game?</summary>
<p>Madrid, by our measurement of all 199 capitals. Whatever the answer turns out to be, Madrid never leaves more than 26 other capitals sharing the same distance reading within a 500 km tolerance. Riga, Helsinki and Tallinn are close behind at 27–28.</p>
</details>

<details>
<summary>Why is guessing capitals harder than guessing countries?</summary>
<p>A country is an area, so a guess near the answer reads warm automatically. A capital is a single point with no catchment, and capitals cluster far more tightly than country centres do — twelve of them sit within 500 km of Belgrade alone.</p>
</details>

<details>
<summary>Which capital is furthest from its own country's centre?</summary>
<p>Moscow, at 3,206 km from Russia's geographic centroid. Ottawa (2,081 km), Washington D.C. (1,865 km) and Canberra (1,784 km) follow. This is why country knowledge misleads you in a capitals game.</p>
</details>

<details>
<summary>Which capital city is the most isolated?</summary>
<p>Canberra and Wellington tie: each one's nearest other capital is the other, 2,326 km away. Dili is next at 1,905 km. Isolated capitals are the easiest answers in the game, because one warm reading identifies them outright.</p>
</details>

<details>
<summary>How many guesses should a capital take?</summary>
<p>Six is a realistic target with a good opener and a deliberate second guess roughly 90 degrees away. Two guesses lock the region, two split the cluster, and two commit. Clusters are what push players past that.</p>
</details>

<details>
<summary>Does Globle Capitals have a daily answer?</summary>
<p>No. <a href="/capitals">Globle Capitals</a> runs unlimited rather than once a day, so a new capital starts the moment you finish one. The daily rotation applies to the country game, whose answer is published on our <a href="/globle-answer-today">answer page</a>.</p>
</details>

---

**Method.** Distances are great-circle, computed on capital coordinates with the haversine formula — the same function the game scores with. The dataset holds 199 capitals; "worst case left" is the maximum, over all possible answers, of the number of other capitals whose distance from the opener falls within 500 km of the answer's. Figures are reproducible from `scripts/blog-data.mjs` in our repository.

Ready to use it? [Play Globle Capitals](/capitals), or read the [country-side version of this study](/blog/best-globle-starting-country).
