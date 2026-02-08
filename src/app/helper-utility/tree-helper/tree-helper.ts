import { find } from 'lodash';
import { TreeMetaData } from './tree-type';

/**
 * Update list children node to parent by parent nodeId
 *
 * @param root: Root tree
 * @param parentNodeId: parent node id need to update
 * @param childNodes: New list child node
 *
 * @returns Root tree after updated
 */
export const updateChildNodeByParentNodeId = <T extends TreeMetaData<T>>(
  root: T[],
  parentNodeId: string,
  childNodes: T[],
): T[] => {
  return root.map((node) => {
    if (node.id === parentNodeId) {
      return {
        ...node,
        children: childNodes,
      };
    } else if (node.children) {
      return {
        ...node,
        children: updateChildNodeByParentNodeId(
          node.children,
          parentNodeId,
          childNodes,
        ),
      };
    }

    return {
      ...node,
    };
  }) as T[];
};

/**
 * Update node by nodeId
 *
 * @param root: Root tree
 * @param nodeId: nodeId need to update
 * @param updateValue: Data need to update
 *
 * @returns Root tree after updated
 */
export const updateNodeByNodeId = <T extends TreeMetaData<T>>(
  root: T[],
  nodeId: string,
  updateValue: Record<string, unknown>,
): T[] => {
  return root.map((node) => {
    if (node.id === nodeId) {
      return {
        ...node,
        ...updateValue,
      };
    } else if (node.children) {
      return {
        ...node,
        children: updateNodeByNodeId(node.children, nodeId, updateValue),
      };
    }

    return {
      ...node,
    };
  }) as T[];
};

/**
 * Remove list node form root tree
 *
 * @param root: Root tree
 * @param nodesRemoved: list node need to remove
 *
 * @returns Root tree after removed
 */
export const removeNodeByNodeId = <T extends TreeMetaData<T>>(
  root: T[],
  nodesRemoved: T[],
): T[] => {
  return root.map((node) => {
    if (node.children && node.children.length) {
      const nodeAfterRemoved = {
        ...node,
        children: node.children.filter(
          (item) => !find(nodesRemoved, { id: item.id }),
        ),
      };

      const nodeChildren = removeNodeByNodeId(
        nodeAfterRemoved.children,
        nodesRemoved,
      );

      return {
        ...nodeAfterRemoved,
        children: nodeChildren,
        hasChildren: !!nodeChildren.length,
      };
    }

    return {
      ...node,
    };
  }) as T[];
};

/**
 * Add children node to parent by parent nodeId
 *
 * @param root: Root tree
 * @param parentNodeId: parent node id need to update
 * @param nodeAdded: list children node need to added
 *
 * @returns T Root tree after added
 */
export const addChildrenNodeByNodeId = <T extends TreeMetaData<T>>(
  root: T[],
  parentNodeId: string,
  nodeAdded: T,
): T[] => {
  return root.map((node) => {
    if (node.id === parentNodeId) {
      return {
        ...node,
        children: [nodeAdded, ...(node.children || [])],
        hasChildren: true,
      };
    } else if (node.children) {
      return {
        ...node,
        children: addChildrenNodeByNodeId(
          node.children,
          parentNodeId,
          nodeAdded,
        ),
      };
    }

    return node;
  }) as T[];
};

/**
 * Find node by nodeId
 *
 * @param root: Root tree
 * @param nodeId: node id need to find
 *
 * @returns T | null
 */
export const findNodeById = <T extends TreeMetaData<T>>(
  rootNode: T,
  nodeId: string,
): T | null => {
  if (rootNode.id === nodeId) {
    return rootNode;
  } else if (rootNode.children?.length) {
    for (const nodeChild of rootNode.children) {
      const result = findNodeById(nodeChild, nodeId);

      if (result) {
        return result;
      }
    }
  }

  return null;
};
