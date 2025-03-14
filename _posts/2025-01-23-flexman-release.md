---
layout: news
tags: [Release]
title: "FlexMan: A New Adaptive Scheduling and Optimization Library Released"
description: The STRATEGUS team has released the first version of FlexMan, an adaptive scheduling and optimization library for continuous-time scheduling problems.
author: Enrico Fraccaroli
background: /assets/theme/images/source_code_release.png
comments: true
---

We are thrilled to announce the release of **FlexMan**, a new adaptive
scheduling and optimization library developed as part of the STRATEGUS project.
FlexMan is designed to solve continuous-time scheduling problems by finding
optimal sequences of modes to achieve target states efficiently. This powerful,
modular library offers a wide range of features to support applications in
industrial environments and beyond.

### Key Features

- **Generalized Scheduling**: Solve continuous-time scheduling problems by evolving systems toward desired target states.
- **Resource Tracking**: Monitor and optimize multi-dimensional metrics such as energy and time.
- **Simulation Managers**: Seamlessly handle discrete and continuous system evolution.
- **Pareto Optimization**: Evaluate trade-offs between performance metrics.
- **Post-Search Optimization**: Refine results using Particle Swarm Optimization (PSO).
- **Custom Search Strategies**: Perform exhaustive searches or use heuristics for faster, approximate solutions.
- **Flexibility and Modularity**: Easily adapt to other use cases and systems.

### Example Application: Industrial Tapping Machine

FlexMan has been successfully applied to simulate and optimize the operations of
an industrial tapping machine. The example demonstrates:

- Discrete and continuous search managers for system simulation.
- Multi-dimensional resource tracking (e.g., energy and time).
- Post-search optimization using PSO to achieve optimal performance.

### How to Get Started

FlexMan is header-only and can be easily integrated into your projects. It uses
CMake to manage dependencies, making setup straightforward.

#### Installation

Clone the repository:

```bash
git clone https://github.com/STRATEGUS-HE2022/flexman.git
cd flexman
```

Build the project:

```bash
mkdir build && cd build
cmake ..
make
```

#### Example Usage

Run the provided example for the industrial tapping machine:

```bash
./flexman_tapping --run 0 --mode 0 --algorithm 0 --pso --output output.json --plot
```

This command performs a search, applies PSO optimization, and generates results for visualization.

### Source Code and Documentation

FlexMan's code and detailed documentation are available on GitHub:

- **Repository**: [FlexMan on GitHub](https://github.com/STRATEGUS-HE2022/flexman)

The repository contains a comprehensive README file, examples, and instructions to help you get started quickly.

### Acknowledgments

FlexMan was developed as part of the STRATEGUS project, funded under the
European Union’s Marie Skłodowska-Curie Actions program. Special thanks to our
collaborators and contributors for their support and inspiration.

---

Stay tuned for updates and further developments as FlexMan evolves. We look
forward to hearing about your use cases and contributions!
