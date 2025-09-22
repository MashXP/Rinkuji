import { NodeFilterManager } from '../../src/js/managers/NodeFilterManager.js';

describe('NodeFilterManager', () => {
    let kanjiRegex;
    let nodeFilterManager;

    beforeEach(() => {
        // A simple regex that matches common Kanji characters
        kanjiRegex = /[\u4e00-\u9faf\u3400-\u4dbf]/;
        nodeFilterManager = new NodeFilterManager(kanjiRegex);

        // Mock requestAnimationFrame and setTimeout for setNodeVisibility
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => cb());
        jest.spyOn(window, 'setTimeout').mockImplementation(cb => cb());
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // Helper to create a mock node
    const createMockNode = (wordSlug, children = [], isRootNode = false) => {
        const node = document.createElement('div');
        node.dataset.wordSlug = wordSlug;
        node.dataset.isRootNode = isRootNode.toString();
        node._children = children;
        node.style = { opacity: '', display: '' };
        node.lineElement = null;
        node._linkingLineToOriginal = null;
        node._linkingLinesFromThisNode = null;
        node.querySelectorAll = jest.fn(() => []); // Default to no spans

        // More robust classList mock
        const classList = [];
        const classListMock = {
            add: jest.fn((...classes) => {
                classes.forEach(cls => {
                    if (!classList.includes(cls)) classList.push(cls);
                });
            }),
            remove: jest.fn((...classes) => {
                classes.forEach(cls => {
                    const index = classList.indexOf(cls);
                    if (index > -1) {
                        classList.splice(index, 1);
                    }
                });
            }),
            toggle: jest.fn((cls, force) => {
                if (force === true) {
                    if (!classList.includes(cls)) classList.push(cls);
                } else if (force === false) {
                    const index = classList.indexOf(cls);
                    if (index > -1) classList.splice(index, 1);
                } else { // No force argument, toggle
                    if (classList.includes(cls)) {
                        const index = classList.indexOf(cls);
                        if (index > -1) classList.splice(index, 1);
                    } else {
                        classList.push(cls);
                    }
                }
            }),
            contains: jest.fn((cls) => classList.includes(cls)),
            _getClasses: () => classList // Helper for testing
        };
        Object.defineProperty(node, 'classList', {
            value: classListMock,
            configurable: true
        });
        return node;
    };

    // Helper to create a mock span element
    const createMockSpan = (textContent) => {
        const span = document.createElement('span');
        span.textContent = textContent;
        Object.defineProperty(span, 'classList', {
            value: { add: jest.fn(), remove: jest.fn(), toggle: jest.fn() },
            configurable: true
        });
        span.style = { opacity: '', display: '' };
        return span;
    };

    describe('_isKanjiOnly', () => {
        test('should return true for a word with only Kanji characters', () => {
            expect(nodeFilterManager._isKanjiOnly('日本語')).toBe(true);
        });

        test('should return false for a word with mixed Kanji and Kana', () => {
            expect(nodeFilterManager._isKanjiOnly('日本go')).toBe(false);
        });

        test('should return false for a word with only Kana characters', () => {
            expect(nodeFilterManager._isKanjiOnly('ひらがな')).toBe(false);
        });

        test('should return true for an empty string', () => {
            expect(nodeFilterManager._isKanjiOnly('')).toBe(true);
        });
    });

    describe('filterNodeContent', () => {
        let node;
        let applyChildFilterRecursivelySpy;

        beforeEach(() => {
            node = createMockNode('日本語');
            applyChildFilterRecursivelySpy = jest.spyOn(nodeFilterManager, 'applyChildFilterRecursively');
        });

        afterEach(() => {
            applyChildFilterRecursivelySpy.mockRestore();
        });

        test('should set filterType and filterClickedKanji on the node', () => {
            nodeFilterManager.filterNodeContent(node, 'all', null);
            expect(node.dataset.filterType).toBe('all');
            expect(node.dataset.filterClickedKanji).toBe('');

            nodeFilterManager.filterNodeContent(node, 'start-kanji', '日');
            expect(node.dataset.filterType).toBe('start-kanji');
            expect(node.dataset.filterClickedKanji).toBe('日');
        });

        test('should call applyChildFilterRecursively', () => {
            nodeFilterManager.filterNodeContent(node, 'all', null);
            expect(applyChildFilterRecursivelySpy).toHaveBeenCalledWith(node);
        });

        test('should hide spans not matching clickedKanjiChar for start-kanji filter', () => {
            const span1 = createMockSpan('日');
            const span2 = createMockSpan('本');
            const span3 = createMockSpan('語');
            node.querySelectorAll.mockReturnValue([span1, span2, span3]);

            nodeFilterManager.filterNodeContent(node, 'start-kanji', '本');

            expect(span1.classList.toggle).toHaveBeenCalledWith('kanji-hidden-by-filter', true);
            expect(span1.style.opacity).toBe('0');
            expect(span2.classList.toggle).toHaveBeenCalledWith('kanji-hidden-by-filter', false);
            expect(span2.style.opacity).toBe('1');
            expect(span3.classList.toggle).toHaveBeenCalledWith('kanji-hidden-by-filter', false);
            expect(span3.style.opacity).toBe('1');
        });

        test('should remove kanji-hidden-by-filter class for non-start-kanji filters', () => {
            const span1 = createMockSpan('日');
            const span2 = createMockSpan('本');
            node.querySelectorAll.mockReturnValue([span1, span2]);

            // Simulate a previous start-kanji filter
            span1.classList.add('kanji-hidden-by-filter');
            span1.style.opacity = '0';

            nodeFilterManager.filterNodeContent(node, 'all', null);

            expect(span1.classList.remove).toHaveBeenCalledWith('kanji-hidden-by-filter');
            expect(span1.style.opacity).toBe('1');
            expect(span2.classList.remove).toHaveBeenCalledWith('kanji-hidden-by-filter');
            expect(span2.style.opacity).toBe('1');
        });
    });

    describe('applyInheritedFilter', () => {
        let newNode;
        let newLine;

        beforeEach(() => {
            newNode = createMockNode('日本語');
            newLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        });

        test('should not add classes if parentFilterType is all', () => {
            nodeFilterManager.applyInheritedFilter(newNode, newLine, 'all', null);
            expect(newNode.classList.add).not.toHaveBeenCalled();
        });

        test('should add mixed-content-node and node-hidden-by-filter for mixed content kanji filter', () => {
            newNode.dataset.wordSlug = '日本go'; // Mixed content
            nodeFilterManager.applyInheritedFilter(newNode, newLine, 'kanji', null);
            expect(newNode.classList.add).toHaveBeenCalledWith('mixed-content-node');
            expect(newNode.classList.add).toHaveBeenCalledWith('node-hidden-by-filter');
        });

        test('should not add classes for pure kanji with kanji filter', () => {
            newNode.dataset.wordSlug = '日本語'; // Pure Kanji
            nodeFilterManager.applyInheritedFilter(newNode, newLine, 'kanji', null);
            expect(newNode.classList.add).not.toHaveBeenCalledWith('mixed-content-node');
            expect(newNode.classList.add).not.toHaveBeenCalledWith('node-hidden-by-filter');
        });

        test('should store filterType and filterClickedKanji on newNode', () => {
            nodeFilterManager.applyInheritedFilter(newNode, newLine, 'start-kanji', '日');
            expect(newNode.dataset.filterType).toBe('start-kanji');
            expect(newNode.dataset.filterClickedKanji).toBe('日');
        });
    });

    describe('applyChildFilterRecursively', () => {
        let parentNode;
        let childNode1;
        let childNode2;
        let setNodeVisibilitySpy;

        beforeEach(() => {
            childNode1 = createMockNode('日本go'); // Mixed content
            childNode2 = createMockNode('ひらがな'); // Pure Kana
            parentNode = createMockNode('親', [childNode1, childNode2]);
            parentNode.dataset.filterType = 'kanji';
            parentNode.dataset.filterClickedKanji = '';
            setNodeVisibilitySpy = jest.spyOn(nodeFilterManager, 'setNodeVisibility');
        });

        afterEach(() => {
            setNodeVisibilitySpy.mockRestore();
        });

        test('should propagate filter settings to children', () => {
            nodeFilterManager.applyChildFilterRecursively(parentNode);
            expect(childNode1.dataset.filterType).toBe('kanji');
            expect(childNode1.dataset.filterClickedKanji).toBe('');
            expect(childNode2.dataset.filterType).toBe('kanji');
            expect(childNode2.dataset.filterClickedKanji).toBe('');
        });

        test('should hide mixed-content node with no children when parentFilterType is kanji', () => {
            childNode1._children = []; // Ensure no children
            nodeFilterManager.applyChildFilterRecursively(parentNode);
            expect(childNode1.classList.add).toHaveBeenCalledWith('mixed-content-node');
            expect(childNode1.classList.toggle).toHaveBeenCalledWith('node-hidden-by-filter', true);
            expect(setNodeVisibilitySpy).toHaveBeenCalledWith(childNode1, false);
        });

        test('should add mixed-content-node class but not hide if mixed-content node has children', () => {
            const grandChild = createMockNode('孫');
            childNode1._children = [grandChild]; // Has children
            nodeFilterManager.applyChildFilterRecursively(parentNode);
            expect(childNode1.classList.add).toHaveBeenCalledWith('mixed-content-node');
            expect(childNode1.classList.toggle).toHaveBeenCalledWith('node-hidden-by-filter', false);
            expect(setNodeVisibilitySpy).toHaveBeenCalledWith(childNode1, true);
        });

        test('should hide pure kana node when parentFilterType is kanji', () => {
            nodeFilterManager.applyChildFilterRecursively(parentNode);
            expect(childNode2.classList.toggle).toHaveBeenCalledWith('node-hidden-by-filter', true);
            expect(setNodeVisibilitySpy).toHaveBeenCalledWith(childNode2, false);
        });

        test('should not hide pure kanji node when parentFilterType is kanji', () => {
            const pureKanjiNode = createMockNode('漢字');
            parentNode._children.push(pureKanjiNode);
            nodeFilterManager.applyChildFilterRecursively(parentNode);
            expect(pureKanjiNode.classList.toggle).toHaveBeenCalledWith('node-hidden-by-filter', false);
            expect(setNodeVisibilitySpy).toHaveBeenCalledWith(pureKanjiNode, true);
        });

        test('should recursively call for children', () => {
            const grandChild = createMockNode('孫');
            childNode1._children = [grandChild];
            
            // Spy on the method but allow the original implementation to be called for this test
            const originalMethod = nodeFilterManager.applyChildFilterRecursively;
            const spy = jest.spyOn(nodeFilterManager, 'applyChildFilterRecursively').mockImplementation((...args) => {
                originalMethod.apply(nodeFilterManager, args);
            });
 
            nodeFilterManager.applyChildFilterRecursively(parentNode);
 
            expect(spy).toHaveBeenCalledWith(childNode1);
            expect(spy).toHaveBeenCalledWith(childNode2);
            expect(spy).toHaveBeenCalledWith(grandChild);
            spy.mockRestore(); // Clean up the spy after this test
        });

        test('should not set visibility if parentNode is collapsed', () => {
            parentNode.dataset.collapsed = 'true';
            nodeFilterManager.applyChildFilterRecursively(parentNode);
            expect(setNodeVisibilitySpy).not.toHaveBeenCalled();
        });
    });

    describe('setNodeVisibility', () => {
        let node;
        let lineElement;
        let linkingLineToOriginal;
        let linkingLinesFromThisNode;

        beforeEach(() => {
            node = createMockNode('test');
            lineElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            linkingLineToOriginal = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            linkingLinesFromThisNode = [document.createElementNS('http://www.w3.org/2000/svg', 'line')];

            node.lineElement = lineElement;
            node._linkingLineToOriginal = linkingLineToOriginal;
            node._linkingLinesFromThisNode = linkingLinesFromThisNode;

            // Mock style properties for elements
            [node, lineElement, linkingLineToOriginal, ...linkingLinesFromThisNode].forEach(el => {
                el.style = { opacity: '', display: '' };
            });
        });

        test('should set display and opacity for visible elements', () => {
            nodeFilterManager.setNodeVisibility(node, true);
            expect(node.style.display).toBe('');
            expect(node.style.opacity).toBe('1');
            expect(lineElement.style.display).toBe('');
            expect(lineElement.style.opacity).toBe('1');
            expect(linkingLineToOriginal.style.display).toBe('');
            expect(linkingLineToOriginal.style.opacity).toBe('1');
            expect(linkingLinesFromThisNode[0].style.display).toBe('');
            expect(linkingLinesFromThisNode[0].style.opacity).toBe('1');
        });

        test('should set opacity to 0 and then display to none for hidden elements', () => {
            nodeFilterManager.setNodeVisibility(node, false);
            expect(node.style.opacity).toBe('0');
            expect(node.style.display).toBe('none');
            expect(lineElement.style.opacity).toBe('0');
            expect(lineElement.style.display).toBe('none');
            expect(linkingLineToOriginal.style.opacity).toBe('0');
            expect(linkingLineToOriginal.style.display).toBe('none');
            expect(linkingLinesFromThisNode[0].style.opacity).toBe('0');
            expect(linkingLinesFromThisNode[0].style.display).toBe('none');
        });

        test('should handle null elements gracefully', () => {
            expect(() => nodeFilterManager.setNodeVisibility(null, true)).not.toThrow();
            expect(() => nodeFilterManager.setNodeVisibility(node, true)).not.toThrow(); // Test with some null internal elements
            node.lineElement = null;
            node._linkingLineToOriginal = null;
            node._linkingLinesFromThisNode = null;
            expect(() => nodeFilterManager.setNodeVisibility(node, true)).not.toThrow();
        });
    });
});
