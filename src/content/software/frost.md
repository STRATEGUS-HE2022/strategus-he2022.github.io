---
name: Frost
kind: Simulation platform
summary: "A simulation platform built on Lingua Franca for the early validation and testing of manufacturing control software, before deployment on the physical shop floor."
partOf: glacier
repository: https://github.com/glacier-project/frost
documentation: https://glacier-project.github.io/glacier-website/
licence: BSD-2-Clause
languages:
  - Lingua Franca
  - Python
publications:
  - turco2025frost
people:
  - enrico-fraccaroli
  - franco-fummi
  - samarjit-chakraborty
order: 2
---

Frost is the simulation infrastructure at the core of GLACIER. It reproduces
machines, software services, communication infrastructure and control
applications inside a deterministic virtual manufacturing environment, so that
control software can be developed and tested against a digital twin and then
deployed on the real system with little or no change.

Frost builds on the Lingua Franca coordination framework, which guarantees
deterministic execution, and supports the integration of multiple
continuous-time machine models. Reusable reactors are distributed as a Lingua
Franca package; component interfaces are described with the GLACIER machine data
model.
