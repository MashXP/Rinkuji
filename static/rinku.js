// rinku.js

// Class to manage Pan and Zoom functionality
class PanZoom {
    constructor(viewport, canvas, zoomInBtn, zoomOutBtn, resetViewBtn, zoomMeter) {
        this.viewport = viewport;
        this.canvas = canvas;
        this.zoomInBtn = zoomInBtn;
        this.zoomOutBtn = zoomOutBtn;
        this.resetViewBtn = resetViewBtn;
        this.zoomMeter = zoomMeter;

        this.scale = 1;
        this.pointX = 0;
        this.pointY = 0;
        this.panning = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.MIN_SCALE = 0.25;
        this.MAX_SCALE = 2.0;
        this.SCALE_INCREMENT = 0.25;

        this.addEventListeners();
        this.resetView(); // Initial setup
    }

    getScale() { return this.scale; }
    getPointX() { return this.pointX; }
    getPointY() { return this.pointY; }

    updateZoomMeter() {
        this.zoomMeter.textContent = `${Math.round(this.scale * 100)}%`;
    }

    setTransform() {
        this.canvas.style.transform = `translate(${this.pointX}px, ${this.pointY}px) scale(${this.scale})`;
        this.updateZoomMeter();
    }

    zoomWithIncrement(increment) {
        const oldScale = this.scale;
        const newScale = oldScale + increment;
        this.scale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, newScale));

        if (oldScale === this.scale) return; // No change, do nothing

        const factor = this.scale / oldScale;

        // The point to zoom on is the center (0,0) in the transform's coordinate space.
        // The formula new_pan = mouse_pos - (mouse_pos - old_pan) * factor becomes:
        // new_pan = 0 - (0 - old_pan) * factor = old_pan * factor
        this.pointX *= factor;
        this.pointY *= factor;

        this.setTransform();
    }

    zoomWithFactor(factor, mouseX, mouseY) {
        const oldScale = this.scale;
        const newScale = oldScale * factor;
        this.scale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, newScale));

        if (oldScale === this.scale) return;

        const actualFactor = this.scale / oldScale;
        // The formula is new_pan = mouse_pos - (mouse_pos - old_pan) * zoom_factor
        // where mouse_pos and old_pan are in the same coordinate system.
        this.pointX = mouseX - (mouseX - this.pointX) * actualFactor;
        this.pointY = mouseY - (mouseY - this.pointY) * actualFactor;
        this.setTransform();
    }

    resetView() {
        this.pointX = 0;
        this.pointY = 0;
        this.scale = 1;
        this.setTransform();
    }

    // Public method for RinkuGraph to call for panning
    handlePanMouseMove(e) {
        if (this.panning) {
            this.pointX += (e.clientX - this.lastMouseX);
            this.pointY += (e.clientY - this.lastMouseY);
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.setTransform();
        }
    }

    addEventListeners() {
        this.viewport.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.panning = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });

        this.viewport.addEventListener('mouseup', () => {
            this.panning = false;
        });

        this.viewport.addEventListener('mouseleave', () => {
            this.panning = false;
        });

        this.viewport.addEventListener('wheel', (e) => {
            e.preventDefault();

            const viewportRect = this.viewport.getBoundingClientRect();
            // The center of the viewport is the origin of our transform's coordinate system
            const viewport_center_x = viewportRect.left + viewportRect.width / 2;
            const viewport_center_y = viewportRect.top + viewportRect.height / 2;

            // Calculate mouse position relative to the transform's origin
            const mouse_rel_x = e.clientX - viewport_center_x;
            const mouse_rel_y = e.clientY - viewport_center_y;

            const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
            this.zoomWithFactor(factor, mouse_rel_x, mouse_rel_y);
        });

        this.zoomInBtn.addEventListener('click', () => this.zoomWithIncrement(this.SCALE_INCREMENT));
        this.zoomOutBtn.addEventListener('click', () => this.zoomWithIncrement(-this.SCALE_INCREMENT));
        this.resetViewBtn.addEventListener('click', () => this.resetView());
    }
}

// Class to manage the Rinku Graph functionality (expansion, nodes, sidebar)
class RinkuGraph {
    constructor(viewport, canvas, wordContainer, svgLayer, nodesContainer, parentKanjiSearchInput, parentKanjiListContainer, panZoom) {
        this.viewport = viewport;
        this.canvas = canvas;
        this.wordContainer = wordContainer;
        this.svgLayer = svgLayer;
        this.nodesContainer = nodesContainer;
        this.parentKanjiSearchInput = parentKanjiSearchInput;
        this.parentKanjiListContainer = parentKanjiListContainer;
        this.panZoom = panZoom; // Dependency injection for PanZoom

        this.word = wordContainer.dataset.word; // The initial word string
        this.wordContainer._children = []; // Initialize the root node's custom children array for graph structure
        this.expandedElements = new Set(); // Tracks all kanji <span> elements that have been clicked
        this.parentKanjiMap = new Map(); // Tracks all kanji used as expansion parents and their first expanded node

        this.draggingNode = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.dragOccurred = false; // Flag to distinguish click from drag

        this.isSearching = false; // Flag to prevent concurrent searches
        this.currentSelectionCircle = null; // Global reference to the currently displayed selection circle
        this.currentSelectionCircleParentNode = null; // The parent node of the kanji the circle is around
        this.currentSelectionCircleOffsetX = null; // Offset of the circle's center from its parent node's center
        this.currentSelectionCircleOffsetY = null;

        this.kanjiRegex = /[\u4e00-\u9faf]/;

        this.initializeGraph();
        this.addEventListeners();
    }

    initializeGraph() {
        // Populate the initial word with clickable Kanji
        this.word.split('').forEach(char => {
            const charSpan = document.createElement('span');
            charSpan.textContent = char;
            if (this.kanjiRegex.test(char)) {
                charSpan.classList.add('kanji-char');
                this._addKanjiEventListeners(charSpan); // All kanji start as clickable
            }
            this.wordContainer.appendChild(charSpan);
        });
    }

    // --- Event Handlers & Listeners ---

    _addKanjiEventListeners(kanjiSpan) {
        kanjiSpan.addEventListener('click', this.handleKanjiClick.bind(this));
        kanjiSpan.addEventListener('dblclick', this.handleKanjiDoubleClick.bind(this));
    }

    async handleKanjiClick(e, isProgrammatic = false) {
        const kanjiElement = e.currentTarget;

        // Block concurrent user clicks, but allow programmatic ones
        if (!isProgrammatic && this.isSearching) {
            console.log('Search in progress. Ignoring user click.');
            return;
        }

        // Use a try...finally block to ensure the lock is always released for user clicks
        try {
            if (!isProgrammatic) {
                this.isSearching = true;
                kanjiElement.classList.add('kanji-loading');
            }

            if (kanjiElement.classList.contains('inactive-kanji') || this.dragOccurred) {
                return;
            }

            const kanjiChar = kanjiElement.textContent;
            const parentNode = kanjiElement.parentElement;
            const isRootNode = parentNode === this.wordContainer;
            // The `expandedKanjiCount` now correctly counts `active-source-kanji` and `expanded-parent-kanji`
            // to determine duplication logic.
            // This count is used to decide if the node has been "activated" enough to be duplicated.
            // It does NOT relate to the selection circle.
            const expandedKanjiCount = parentNode.querySelectorAll('.active-source-kanji, .expanded-parent-kanji').length;

            const shouldDuplicate = (isRootNode && expandedKanjiCount >= 1) || (!isRootNode && expandedKanjiCount > 1);

            if (kanjiElement.classList.contains('kanji-char') && shouldDuplicate) {
                await this.duplicateAndExpandNode(parentNode, kanjiElement);
                return;
            }

            console.log(`Clicked kanji: ${kanjiChar}`);
            const relatedWords = await this._fetchRelatedWords(kanjiChar);

            if (relatedWords.length > 0) {
                // Focus on the kanji that is being expanded. This moves the circle.
                this._focusKanji(kanjiElement);
                this.drawExpansion(kanjiElement, kanjiChar, relatedWords);
                kanjiElement.classList.remove('kanji-char');
                if (!this.expandedElements.has(kanjiElement)) {
                    this.expandedElements.add(kanjiElement);
                }
                kanjiElement.classList.add('active-source-kanji');

                if (!this.parentKanjiMap.has(kanjiChar)) {
                    this.parentKanjiMap.set(kanjiChar, kanjiElement.parentElement);
                    this.updateParentKanjiList();
                }
                console.log(`Expanded ${kanjiChar} with ${relatedWords.length} words.`);
            } else {
                console.log(`Kanji ${kanjiChar} has no new expansions. Marking as expanded-parent-kanji.`);
                kanjiElement.classList.remove('kanji-char');
                if (!this.expandedElements.has(kanjiElement)) {
                    this.expandedElements.add(kanjiElement);
                }
                kanjiElement.classList.add('expanded-parent-kanji');
            }
        } catch (error) {
            console.error("An error occurred during kanji click handling:", error);
        } finally {
            if (!isProgrammatic) {
                this.isSearching = false;
                kanjiElement.classList.remove('kanji-loading');
            }
        }
    }

    // --- Data Fetching ---

    async _fetchRelatedWords(kanjiChar) {
        try {
            const response = await fetch(`/search_by_kanji?kanji=${encodeURIComponent(kanjiChar)}`);
            if (!response.ok) {
                throw new Error(`API error for ${kanjiChar}: ${response.status}`);
            }
            const results = await response.json();
            console.log(`API response for ${kanjiChar}:`, results);

            // Create a set of all slugs currently on the canvas for efficient lookup
            const existingSlugs = new Set(Array.from(this.nodesContainer.querySelectorAll('[data-word-slug]')).map(n => n.dataset.wordSlug));
            existingSlugs.add(this.word);

            return results.data.filter(item => !existingSlugs.has(item.slug));
        } catch (error) {
            console.error('Failed to expand kanji:', error);
            return []; // Return an empty array on failure to prevent crashes
        }
    }

    // --- Drawing and DOM Manipulation ---

    drawExpansion(sourceElement, sourceKanji, words) {
        const parentNode = sourceElement.parentElement;
        const sourcePos = this._getUnscaledElementCenter(sourceElement);

        // Store the offset of the source kanji relative to the parent's center.
        // This will be used as the anchor point for outgoing lines when the parent is moved.
        parentNode._sourceKanjiOffsetX = sourcePos.ux - parseFloat(parentNode.style.left || 0);
        parentNode._sourceKanjiOffsetY = sourcePos.uy - parseFloat(parentNode.style.top || 0);
        // For the root word, its position is (0,0), so the offset is just the absolute position.
        if (parentNode === this.wordContainer) {
            parentNode._sourceKanjiOffsetX = sourcePos.ux;
            parentNode._sourceKanjiOffsetY = sourcePos.uy;
        }

        const expansionRadius = 320; // 20rem * 16px/rem
        const numWords = words.length;

        words.forEach((wordData, i) => {
            const angle = (2 * Math.PI / numWords) * i - (Math.PI / 2); // Start from top
            // Ensure new nodes are positioned relative to the sourcePos (center of the kanji)
            const nodePos = {
                ux: sourcePos.ux + expansionRadius * Math.cos(angle),
                uy: sourcePos.uy + expansionRadius * Math.sin(angle)
            };

            const line = this._createExpansionLine(sourcePos, nodePos);
            const node = this.createWordNode(wordData.slug, sourceKanji, line);

            this._positionAndAppendNode(node, parentNode, nodePos);
            this._fadeInElements(line, node); // Only fade in line and node, circle is handled by _focusKanji
            this._refineLineEndpoint(line, node);
        });
    }

    // This method now only creates the SVG circle element and returns it.
    // It does NOT attach it to the DOM or store it on parentNode.
    _createSelectionCircleSVG(sourceKanjiElement, sourcePos) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const sourceRect = sourceKanjiElement.getBoundingClientRect();
        const circleRadius = (sourceRect.width / this.panZoom.getScale()) * 0.8;

        circle.setAttribute('cx', sourcePos.ux);
        circle.setAttribute('cy', sourcePos.uy);
        circle.setAttribute('r', circleRadius);
        circle.classList.add('selection-circle');
        circle.style.opacity = 0; // Start hidden, _focusKanji will fade it in
        return circle;
    }

    _createExpansionLine(sourcePos, targetPos) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', sourcePos.ux);
        line.setAttribute('y1', sourcePos.uy);
        line.setAttribute('x2', targetPos.ux);
        line.setAttribute('y2', targetPos.uy);
        line.classList.add('expansion-line');
        this.svgLayer.appendChild(line);
        return line;
    }

    createWordNode(wordString, sourceKanji, lineElement) {
        const node = document.createElement('div');
        node.classList.add('expanded-node');
        node.dataset.wordSlug = wordString; // For filtering duplicates
        node.dataset.sourceKanji = sourceKanji; // Store the kanji that created this node
        node._parent = null; // Use _parent to avoid conflict with DOM parentNode
        node._children = []; // Initialize custom children array for graph structure
        node.lineElement = lineElement; // Store reference to the connecting line

        this._addDragHandlersToNode(node);

        wordString.split('').forEach(char => {
            const charSpan = document.createElement('span');
            charSpan.textContent = char;

            if (this.kanjiRegex.test(char)) {
                if (char === sourceKanji) {
                    charSpan.classList.remove('kanji-char'); // Remove default clickable class
                    charSpan.classList.add('active-source-kanji'); // This is the source kanji for this node
                    this.expandedElements.add(charSpan); // Mark as processed (for double-click centering)
                } else if (this.parentKanjiMap.has(char)) {
                    charSpan.classList.remove('kanji-char'); // Remove default clickable class
                    charSpan.classList.add('expanded-parent-kanji'); // This kanji was a parent elsewhere
                    // Only add to expandedElements if it's not already there from being an active source
                    // (This prevents duplicates in the set if a kanji is both a parent and a source)
                    if (!this.expandedElements.has(charSpan)) this.expandedElements.add(charSpan);
                } else {
                    charSpan.classList.add('kanji-char');
                }
                this._addKanjiEventListeners(charSpan);
            }
            node.appendChild(charSpan);
        });
        return node;
    }

    _positionAndAppendNode(node, parentNode, position) {
        node._parent = parentNode;
        parentNode._children.push(node);
        node.style.left = `${position.ux}px`;
        node.style.top = `${position.uy}px`;
        node.style.transform = 'translate(-50%, -50%)';
        this.nodesContainer.appendChild(node);
    }

    _fadeInElements(...elements) {
        requestAnimationFrame(() => {
            elements.forEach(el => el && (el.style.opacity = 1));
        });
    }

    _refineLineEndpoint(line, targetNode) {
        // This needs to run after the node is rendered and has a position
        requestAnimationFrame(() => {
            const targetKanjiSpan = targetNode.querySelector('.active-source-kanji'); // Updated to use the correct class
            if (targetKanjiSpan) {
                const targetPos = this._getUnscaledElementCenter(targetKanjiSpan);
                line.setAttribute('x2', targetPos.ux);
                line.setAttribute('y2', targetPos.uy);
            }
        });
    }

    // --- Node and Element Movement ---

    moveNodeAndChildren(node, dx, dy) {
        const currentX = parseFloat(node.style.left);
        const currentY = parseFloat(node.style.top);
        const newX = currentX + dx;
        const newY = currentY + dy;

        node.style.left = `${newX}px`;
        node.style.top = `${newY}px`;

        // Update the line connecting TO this node (if it's an expansion child)
        this._updateIncomingLine(node, dx, dy);

        // NEW: Update the linking line connecting TO this node (if it's a duplicate)
        if (node._linkingLineToOriginal) {
            node._linkingLineToOriginal.setAttribute('x2', newX);
            node._linkingLineToOriginal.setAttribute('y2', newY);
        }

        // Get anchor point for outgoing lines (usually a selection circle)
        const anchorPoint = this._updateAndGetAnchorPoint(node, newX, newY);

        // Update lines connecting FROM this node to its expansion children
        this._updateOutgoingLines(node, anchorPoint);

        // NEW: Update linking lines connecting FROM this node
        if (node._linkingLinesFromThisNode) {
            // The source of a linking line is the node's center
            node._linkingLinesFromThisNode.forEach(line => {
                line.setAttribute('x1', newX);
                line.setAttribute('y1', newY);
            });
        }

        // Recursively move all children
        node._children.forEach(child => {
            this.moveNodeAndChildren(child, dx, dy);
        });
    }

    _updateIncomingLine(node, dx, dy) {
        if (node.lineElement) {
            const oldX2 = parseFloat(node.lineElement.getAttribute('x2'));
            const oldY2 = parseFloat(node.lineElement.getAttribute('y2'));
            node.lineElement.setAttribute('x2', oldX2 + dx);
            node.lineElement.setAttribute('y2', oldY2 + dy);
        }
    }

    // This method updates the globally focused selection circle if its parent node is being moved,
    // and returns the correct anchor point for any node's outgoing lines.
    _updateAndGetAnchorPoint(node, newX, newY) {
        // Default anchor is the node's center.
        let anchorX = newX;
        let anchorY = newY;

        // If the node being moved is the one with the focused circle, that takes highest priority.
        if (this.currentSelectionCircle && this.currentSelectionCircleParentNode === node) {
            if (node === this.wordContainer) {
                // For the root word, the offsets are absolute canvas coordinates of the kanji
                anchorX = this.currentSelectionCircleOffsetX;
                anchorY = this.currentSelectionCircleOffsetY;
            } else {
                // For expanded nodes, offsets are relative to the node's center
                anchorX = newX + this.currentSelectionCircleOffsetX;
                anchorY = newY + this.currentSelectionCircleOffsetY;
            }
            this.currentSelectionCircle.setAttribute('cx', anchorX);
            this.currentSelectionCircle.setAttribute('cy', anchorY);
        
        // If not focused, but it has been a source of expansion, use that source kanji's offset.
        } else if (node._sourceKanjiOffsetX !== undefined && node._sourceKanjiOffsetY !== undefined) {
            if (node === this.wordContainer) {
                anchorX = node._sourceKanjiOffsetX;
                anchorY = node._sourceKanjiOffsetY;
            } else {
                anchorX = newX + node._sourceKanjiOffsetX;
                anchorY = newY + node._sourceKanjiOffsetY;
            }

        } else if (node === this.wordContainer) {
            // If it's the root word with no expansions and no focus, its anchor is (0,0).
            anchorX = 0;
            anchorY = 0;
        }
        // For any other expanded node without focus or a source offset, the anchor point remains its center (newX, newY).
        return { x: anchorX, y: anchorY };
    }

    _updateOutgoingLines(node, anchorPoint) {
        if (node._children && node._children.length > 0) {
            node._children.forEach(childNode => {
                if (childNode.lineElement) {
                    childNode.lineElement.setAttribute('x1', anchorPoint.x);
                    childNode.lineElement.setAttribute('y1', anchorPoint.y);
                }
            });
        }
    }

    // --- Duplication Logic and Kanji Focusing ---

    async duplicateAndExpandNode(originalNode, clickedKanjiElement) {
        const originalWordString = originalNode.dataset.wordSlug || this.word;
        const clickedKanjiChar = clickedKanjiElement.textContent;

        console.log(`Duplicating node for word "${originalWordString}" to expand kanji "${clickedKanjiChar}"`);

        // 1. Create the new duplicated node
        const newNode = document.createElement('div');
        newNode.classList.add('expanded-node');
        newNode.dataset.wordSlug = originalWordString;
        newNode.dataset.sourceKanji = clickedKanjiChar; // The kanji that triggered this duplication
        newNode._parent = null; // Initialize _parent for the new node
        newNode._children = []; // Initialize _children for the new node
        this._addDragHandlersToNode(newNode); // Add drag handlers to the duplicated node

        // Position the new node "underneath" the original
        // Get the actual unscaled center of the original node for the line's start point
        const originalNodeCenter = this._getUnscaledElementCenter(originalNode);
        const originalLineStartX = originalNodeCenter.ux;
        const originalLineStartY = originalNodeCenter.uy;

        const offsetY = 200;
        const newNode_ux = originalLineStartX; // New node's X is same as original's center X
        const newNode_uy = originalLineStartY + offsetY; // New node's Y is below original's center Y

        // Use the existing helper to position the node. The original becomes the parent.
        this._positionAndAppendNode(newNode, originalNode, { ux: newNode_ux, uy: newNode_uy });
        newNode.style.opacity = 0; // Start hidden for fade-in

        // 2. Populate the new node with characters
        let targetKanjiSpanInNewNode = null;
        originalWordString.split('').forEach(char => {
            const charSpan = document.createElement('span');
            charSpan.textContent = char;

            if (this.kanjiRegex.test(char)) {
                if (char === clickedKanjiChar) {
                    charSpan.classList.remove('kanji-char');
                    charSpan.classList.add('active-source-kanji');
                    targetKanjiSpanInNewNode = charSpan;
                    this.expandedElements.add(charSpan); // Mark as processed (for double-click centering)
                } else if (this.parentKanjiMap.has(char)) {
                    charSpan.classList.remove('kanji-char');
                    charSpan.classList.add('expanded-parent-kanji');
                    // Only add to expandedElements if it's not already there from being an active source
                    if (!this.expandedElements.has(charSpan)) this.expandedElements.add(charSpan);
                } else {
                    charSpan.classList.add('kanji-char');
                }
                this._addKanjiEventListeners(charSpan);
            }
            newNode.appendChild(charSpan);
        });
        // 3. Disable kanji on the original node
        // Find the kanji that was the active source on the original node (if any)
        const originalActiveSourceKanji = originalNode.querySelector('.active-source-kanji');

        originalNode.querySelectorAll('span').forEach(span => {
            // If this span is the one that should remain orange, skip applying inactive-kanji
            if (span === originalActiveSourceKanji) {
                return; // Keep its existing classes (active-source-kanji)
            }
            // For all other kanji, make them inactive
            span.classList.remove('kanji-char', 'active-source-kanji', 'expanded-parent-kanji'); // Remove all active states
            span.classList.add('inactive-kanji'); // Apply inactive state
        });

        // 4. Draw the special linking line
        const linkingLine = this._createExpansionLine({ ux: originalLineStartX, uy: originalLineStartY }, { ux: newNode_ux, uy: newNode_uy });
        linkingLine.classList.remove('expansion-line');
        linkingLine.classList.add('linking-line');

        // Store the linking line for movement updates
        newNode._linkingLineToOriginal = linkingLine;
        if (!originalNode._linkingLinesFromThisNode) originalNode._linkingLinesFromThisNode = [];
        originalNode._linkingLinesFromThisNode.push(linkingLine);

        // 5. Fade in the new node and line
        this._fadeInElements(newNode, linkingLine);

        // 6. Programmatically trigger expansion on the new node's kanji
        if (targetKanjiSpanInNewNode) {
            this.handleKanjiClick({ currentTarget: targetKanjiSpanInNewNode }, true);
        }
    }

    _focusKanji(kanjiElement) {
        // 1. Remove any existing selection circle
        if (this.currentSelectionCircle && this.currentSelectionCircle.parentNode) {
            this.currentSelectionCircle.parentNode.removeChild(this.currentSelectionCircle);
        }
        this.currentSelectionCircle = null;
        this.currentSelectionCircleParentNode = null;
        this.currentSelectionCircleOffsetX = null;
        this.currentSelectionCircleOffsetY = null;

        // 2. Get position of the kanji to focus on
        const sourcePos = this._getUnscaledElementCenter(kanjiElement);
        const parentNode = kanjiElement.parentElement;

        // 3. Create and attach new circle
        const circle = this._createSelectionCircleSVG(kanjiElement, sourcePos);
        this.svgLayer.appendChild(circle);

        // 4. Store global references for movement
        this.currentSelectionCircle = circle;
        this.currentSelectionCircleParentNode = parentNode; // Store the parent node of the focused kanji
        // Calculate offset of the focused kanji's center relative to its parent node's center
        this.currentSelectionCircleOffsetX = sourcePos.ux - parseFloat(parentNode.style.left || 0);
        this.currentSelectionCircleOffsetY = sourcePos.uy - parseFloat(parentNode.style.top || 0);

        // For the root word, its position is (0,0) in canvas coords, so its offset is just its sourcePos
        if (parentNode === this.wordContainer) {
            this.currentSelectionCircleOffsetX = sourcePos.ux;
            this.currentSelectionCircleOffsetY = sourcePos.uy;
        }

        // 5. Ensure it's visible (it starts at opacity 0 in CSS)
        requestAnimationFrame(() => {
            circle.style.opacity = 1;
        });
    }

    // --- Sidebar ---

    updateParentKanjiList() {
        this.parentKanjiListContainer.innerHTML = ''; // Clear existing list
        const searchFilter = this.parentKanjiSearchInput.value.trim().toLowerCase();

        // Sort kanji alphabetically for consistent display
        const sortedKanji = Array.from(this.parentKanjiMap.keys()).sort();

        sortedKanji.forEach(kanjiChar => {
            // Apply search filter
            if (searchFilter && !kanjiChar.toLowerCase().includes(searchFilter)) {
                return; // Skip if it doesn't match the search
            }

            const listItem = document.createElement('div');
            listItem.classList.add('parent-kanji-list-item');
            listItem.textContent = kanjiChar;
            listItem.dataset.kanji = kanjiChar; // Store kanji char for easy lookup

            listItem.addEventListener('click', () => {
                const targetNode = this.parentKanjiMap.get(kanjiChar);
                if (targetNode) {
                    // Find the specific kanji span within the targetNode to focus
                    let foundKanjiSpan = null;
                    Array.from(targetNode.children).forEach(span => {
                        if (span.textContent === kanjiChar && (span.classList.contains('active-source-kanji') || span.classList.contains('expanded-parent-kanji'))) {
                            foundKanjiSpan = span;
                        }
                    });
                    // If found, focus on it and center the view
                    if (foundKanjiSpan) this._focusKanji(foundKanjiSpan);
                    this.centerViewOnElement(targetNode);
                }
            });
            this.parentKanjiListContainer.appendChild(listItem);
        });
    }

    filterParentKanjiList() {
        const searchFilter = this.parentKanjiSearchInput.value.trim().toLowerCase();
        const listItems = this.parentKanjiListContainer.children;
        for (let i = 0; i < listItems.length; i++) {
            const item = listItems[i];
            const kanjiChar = item.dataset.kanji.toLowerCase();
            if (kanjiChar.includes(searchFilter)) {
                item.style.display = ''; // Show
            } else {
                item.style.display = 'none'; // Hide
            }
        }
    }

    centerViewOnElement(element) {
        // Use a slightly longer transition for smooth navigation
        this.canvas.style.transition = 'transform 0.5s ease-in-out';

        // Calculate element's center in the UNTRANSFORMED canvas space
        let element_ux, element_uy;

        if (element === this.wordContainer) {
            // The root node is not positioned with 'left'/'top', so we calculate its center
            // as the origin (0,0) of the canvas's coordinate system.
            element_ux = 0;
            element_uy = 0;
        } else {
            // For expanded nodes, 'left' and 'top' already represent the center.
            element_ux = parseFloat(element.style.left);
            element_uy = parseFloat(element.style.top);
        }

        const newScale = 1.0;

        // To center on a point (element_ux, uy) in the canvas's relative coordinate system,
        // we apply a translation that is the negative of that point's coordinates, scaled by the new scale,
        // which brings that point to the center of the viewport.
        this.panZoom.pointX = -element_ux * newScale;
        this.panZoom.pointY = -element_uy * newScale;
        this.panZoom.scale = newScale;

        this.panZoom.setTransform();

        // Reset transition to the default after the animation
        setTimeout(() => {
            this.canvas.style.transition = 'transform 0.1s ease-out';
        }, 500);
    }

    handleKanjiDoubleClick(e) {
        const kanjiElement = e.currentTarget; // This will be the span element
        // Only allow centering on kanji that are either active sources or expanded parents
        if (kanjiElement.classList.contains('active-source-kanji') || kanjiElement.classList.contains('expanded-parent-kanji')) {
            e.stopPropagation();
            const nodeToCenterOn = kanjiElement.parentElement;
            this._focusKanji(kanjiElement); // Focus on the double-clicked kanji
            this.centerViewOnElement(nodeToCenterOn);
        }
    }

    // --- Utility and Helper Methods ---

    _getCanvasCoordinates(event) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const scale = this.panZoom.getScale();
        const ux = (event.clientX - canvasRect.left) / scale;
        const uy = (event.clientY - canvasRect.top) / scale;
        return { ux, uy };
    }

    _getUnscaledElementCenter(element) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const elemRect = element.getBoundingClientRect();
        const scale = this.panZoom.getScale();

        const vx = elemRect.left + elemRect.width / 2;
        const vy = elemRect.top + elemRect.height / 2;

        const ux = (vx - canvasRect.left) / scale;
        const uy = (vy - canvasRect.top) / scale;

        return { ux, uy };
    }

    _addDragHandlersToNode(node) {
        node.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.draggingNode = node;

            const { ux: mouse_ux, uy: mouse_uy } = this._getCanvasCoordinates(e);
            const node_center_ux = parseFloat(node.style.left);
            const node_center_uy = parseFloat(node.style.top);

            this.dragOffsetX = mouse_ux - node_center_ux;
            this.dragOffsetY = mouse_uy - node_center_uy;

            this.draggingNode.style.cursor = 'grabbing';
            this.draggingNode.style.zIndex = '1000';
        });
    }

    addEventListeners() {
        // Event listener for sidebar search input
        this.parentKanjiSearchInput.addEventListener('input', this.filterParentKanjiList.bind(this));

        // Mousemove for dragging nodes AND panning
        this.viewport.addEventListener('mousemove', (e) => {
            // If the mouse is down and moving, it's a drag.
            if (this.draggingNode || this.panZoom.panning) {
                this.dragOccurred = true;
            }

            if (this.draggingNode) {
                e.stopPropagation(); // Prevent pan if dragging a node
                const { ux, uy } = this._getCanvasCoordinates(e);
                const new_center_ux = ux - this.dragOffsetX;
                const new_center_uy = uy - this.dragOffsetY;
                const old_center_ux = parseFloat(this.draggingNode.style.left);
                const old_center_uy = parseFloat(this.draggingNode.style.top);
                const dx = new_center_ux - old_center_ux;
                const dy = new_center_uy - old_center_uy;

                if (dx !== 0 || dy !== 0) {
                    this.moveNodeAndChildren(this.draggingNode, dx, dy);
                }
                return;
            }
            // If not dragging a node, let PanZoom handle panning
            this.panZoom.handlePanMouseMove(e);
        });

        // Mouseup/mouseleave for dragging nodes (needs to be on viewport to capture outside node)
        this.viewport.addEventListener('mouseup', () => {
            if (this.draggingNode) {
                this.draggingNode.style.cursor = 'grab';
                this.draggingNode.style.zIndex = '';
                this.draggingNode = null;
            }

            // Use a timeout to reset the drag flag after the click event has fired.
            setTimeout(() => {
                this.dragOccurred = false;
            }, 0);
        });

        this.viewport.addEventListener('mouseleave', () => {
            if (this.draggingNode) {
                this.draggingNode.style.cursor = 'grab';
                this.draggingNode.style.zIndex = '';
                this.draggingNode = null;
            }
            // Also reset drag flag if mouse leaves the viewport while down
            setTimeout(() => {
                this.dragOccurred = false;
            }, 0);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const viewport = document.getElementById('rinkuViewport');
    const canvas = document.getElementById('rinkuCanvas');
    const wordContainer = document.getElementById('rinkuWord');

    // Graph-related elements
    const svgLayer = document.getElementById('rinkuSvgLayer');
    const nodesContainer = document.getElementById('rinkuNodesContainer');
    // Zoom UI elements
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetViewBtn = document.getElementById('resetViewBtn');
    const zoomMeter = document.getElementById('zoomMeter');
    // Sidebar elements
    const parentKanjiSidebar = document.getElementById('parentKanjiSidebar');
    const parentKanjiSearchInput = document.getElementById('parentKanjiSearch');
    const parentKanjiListContainer = document.getElementById('parentKanjiList');

    // NEW: Sidebar Toggle Button
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');

    // Instantiate PanZoom
    const panZoom = new PanZoom(viewport, canvas, zoomInBtn, zoomOutBtn, resetViewBtn, zoomMeter);

    // Instantiate RinkuGraph, passing PanZoom instance
    const rinkuGraph = new RinkuGraph(viewport, canvas, wordContainer, svgLayer, nodesContainer, parentKanjiSearchInput, parentKanjiListContainer, panZoom);

    // Add event listener for the sidebar toggle
    sidebarToggleBtn.addEventListener('click', () => {
        parentKanjiSidebar.classList.toggle('visible');
        sidebarToggleBtn.classList.toggle('active');

        // Change icon and title based on active state for better UX
        if (sidebarToggleBtn.classList.contains('active')) {
            sidebarToggleBtn.textContent = '✕';
            sidebarToggleBtn.title = 'Close Kanji List';
        } else {
            sidebarToggleBtn.textContent = '☰';
            sidebarToggleBtn.title = 'Toggle Kanji List';
        }
    });
});