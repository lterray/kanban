# kanban grid
Kanban table implementation
  - plain javascript
  - drag and drop
  - works on mobile also

### Demo
[JSFiddle demo](https://jsfiddle.net/tlaci/a6LL4a13)
<p><image src="screenshot.png" /></p>
### Why
We wanted to insert a classic kanban table into an issue tracker application and let the user drag and drop the elements in the table changing their properties accordingly.

### Solution
kanbanGrid.js contains a small js function which draws out the table into the given dom element getting the data of the elements as parameters.
It can call a javascript callback or can make an ajax call to the given URL when an element is dropped to the other cell of the kanban table.
  The function uses [interact.js](http://interactjs.io/) for the implementation of the drag and drop and except that it is just plain javascript so you don't need too much stuff to make it work.

### Usage
Example of calling:
```javascript
kanbanGrid(parameters, '#interactGridTest');
```
Where the 'parameters' javascript object contains the structure and the data of the grid and the second parameter is a css selector which leads to the DOM element where the grid should be drawn.

### Parameters
The parameter object must contain the following 3 properties:

##### fieldList
It explains the structure of one *item* (ticket/issue/task) in the grid. One object in the array is one property/field of an item.

Example:
```javascript
fieldList: [
        {name: "Id", map: "id", location: "hidden"},
        {name: "Summary", map: "title", location: "header", link: "http://examplelink.com/{id}"},
        {name: "Issue State", map: "state", location: "content", cssClass: "state"},
        {name: "Owner", map: "assignee", location: "content"},
        {name: "Priority", map: "priority", location: "footer"},
        {name: "Last Changed", map: "lastEdit", location: "footer"}
    ]
```
Explanation (* = mandatory):
- **Name** (*): We show the property with this name on the GUI
- **Map** (*): We refer the field with this name in the other parameters
- **Location** (default: Content): it defines how we show a property on the GUI
  - hidden: it is hidden
  - header: on the top part of the item
  - content: middle of the item
  - footer: bottom part
  - link: If given then we show the field as a link to the given page. The value can contain other field names which will be replaced with values from the item. Example: http://urltomyserver.com/show-this-item?id={id}
  - cssClass: We render the field with this class if given

##### source
The concrete values of the items. One object in the array is one item. The fields are defined with the 'map' value from the *fieldList* array, for example 'state' and not 'Issue State' 

Example:
```javascript
source: [
        {id: "12", title: "Go to the laundry", state: "Created", assignee: "Tyrion", priority: 9, lastEdit: "2016.06.06"},
        {id: "13", title: "Feed the dog", state: "Ready", assignee: "Arya", priority: 4, lastEdit: "2016.06.11"},
        {id: "14", title: "Dishwashing", state: "InProgress", assignee: "Tyrion", priority: 6, lastEdit: "2016.06.03"},
        {id: "15", title: "Mowing", state: "Created", assignee: "Unassigned", priority: 2, lastEdit: "2016.06.01"},
        {id: "16", title: "Cooking", state: "Ready", assignee: "Unassigned", priority: 4, lastEdit: "2016.06.24"}
],
```

##### config
The general settings of the grid

Example:
```javascript
        columnField: "state",
        columns: [{name: "Created", value: 0, limit: 3}, {name: "InProgress", value: 1, limit: 3}, {name: "Ready", value: 2, limit: 3}, {name: "Archived", value: 3, limit: 3}],
        rowField: "assignee",
        rows: [{name: "Unassigned", value: 'ua', limit: 3}, {name: "Tyrion", value: 13, limit: 3}, {name: "Arya", value: 17, limit: 3}],
        colorField: "priority",
        colorValues: {1: "#33cc33", 2: "#33cc33", 3: "#33cc33", 4: "yellow", 5: "yellow", 6: "yellow", 7: "yellow", 8: "#ffcccc", 9: "#ffcccc", 10: "#ffcccc"},
        zeroLimitColor: "#ffcccc",
        transactionUrl: "http://updateMyElement.com?id={id}&assignee={assignee}&state={state-value}",,
        transactionCallback: function (droppedItem) {
            // if returns false then element gets back to its original position
            return true;
        }
}
```
Explanation (* = mandatory):
- **columnField** (*, string): this will be the field which we uses as the columns of the grid
- **columns** (*, array of the column descriptor objects): these are the possible values for the column field. Structure:
  - name (*): we show this as the header of the column
  - value: the value which can be used for the ajax call to the server when an item is dargAndDropped
  - limit: it can define how many elements are allowed to be in this column. If exceeded then the dropped element is put back to its place
- **rowField** (string): this will be the field which we uses as the rows of the grid. If not given then there will be only columns.
- **rows** (array of the row descriptor objects): these are the possible values for the row field. Structure is same as for the columns
- **colorField** (*, string): the items will be colored by this field
- **colorValues** (object): if not given then the colors are automatically generated. If given then colors can be defined for the possible values of the color field (example above). It expects css color definitions.
- **zeroLimitColor** (string): If it is defined and there is any row or column with 0 limit then the cells of the row or column will get this background color. It expects css color definitions.
- **transactionUrl** (string): when an item is dropped then this URL is called if given. It can use field names like {id} which will be replaced by the values of the dropped item. It can contain not only the name of the column/row fields but its values with {<column/row field name>-value} syntax.
  - For example if the column field is ‘state’ and the item is dropped into the ‘inProgress’ column, where the value for name ‘inProgress’ is '3' (defined in *columns* array) then “exampleurl.com?status={status}&sv={status-value}” transactionUrl will be converted to this ajax call: “exampleurl.com?status=InProgress&sv=3”
    - Return value must be a JSON object string if something else is returned the throws error and the item is put back to its original place
    - If the returned object has not ‘result’ property, or its value is not “ok”, then throws error and the item is put back to its original place. If has ‘error’ property, then popups that error otherwise shows a general error message. Example: *{"error": "This transaction is not allowed"}*
    - If the returned JSON has ‘result’ property and it is equal to “ok” then the drop is allowed. Besides if the object has ‘changes’ property then its field/value pairs are set in the item. Example: *{"result": "ok", "changes": {"lastEdit": "today", "priority": "99"}}*
- **transactionCallback** (function): when an item is dropped then this callback is called if given. It gets the dropped js object as a first parameter and the dropped html element as a second parameter. If returns 'false' then the item is put back to its original place
