import {Node} from './Node.js';
export class LinkedList {
  constructor () {
    this.head = null;
    this.size = 0;
  }
  add (element) {
    var node = new Node (element);
    var curr;
    if (this.head == null) {
      this.head = node;
    } else {
      curr = this.head;
      while (curr.next) {
        curr = curr.next;
      }
      curr.next = node;
    }
    this.size++;
  }
}
