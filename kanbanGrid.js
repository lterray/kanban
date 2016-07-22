
function kanbanGrid(parameters, containerSelector) {
    var container = document.querySelector(containerSelector);

    // mandatory params
    var mandatoryParameters = [
        {input: parameters, key: 'fieldList'},
        {input: parameters, key: 'source'},
        {input: parameters, key: 'config'},
        {input: parameters.config, key: 'columnField'},
        {input: parameters.config, key: 'columns'},
        {input: parameters.config, key: 'colorField'},
    ];
    for (var i = 0; i < parameters.fieldList.length; i++) {
        mandatoryParameters.push({input: parameters.fieldList[i], key: 'name'});
        mandatoryParameters.push({input: parameters.fieldList[i], key: 'map'});
    }

    function errorHandler(errorMessage) {
        if (!typeof (container) !== 'undefined') {
            container.innerHTML = errorMessage;
        }
        throw errorMessage;
    }

    // validate params
    if (typeof (parameters) === "undefined" || typeof (container) === "undefined") {
        errorHandler('Missing base parameter for kanban grid');
    }
    if (typeof (interact) !== "function") {
        errorHandler('Interact js library is mandatory for kanban grid');
    }

    function checkMandatoryParam(input, paramKey) {
        if (typeof input[paramKey] === 'undefined') {
            var errorMessage = paramKey + ' is not defined for drag and drop grid';
            errorHandler(errorMessage);
        }
    }
    for (var i = 0; i < mandatoryParameters.length; i++) {
        checkMandatoryParam(mandatoryParameters[i].input, mandatoryParameters[i].key)
    }

    // random color generator helpers
    var stringToColour = function (str) {
        // str to hash
        for (var i = 0, hash = 0; i < str.length; hash = str.charCodeAt(i++) + ((hash << 5) - hash))
            ;

        // int/hash to hex
        for (var i = 0, colour = "#"; i < 3; colour += ("00" + ((hash >> i++ * 8) & 0xFF).toString(16)).slice( - 2))
            ;

        return colour;
    }

    function tableCreate(columnData, rowData) {
        var table = document.createElement('table');
        table.className += ' kanban-grid';
        table.style.width = '100%';
        var tbody = document.createElement('tbody');

        var rowDataExists = typeof (rowData) !== 'undefined';
        for (var rowIndex = -1; rowIndex < (rowDataExists ? rowData.length : 1); rowIndex++) {
            var tr = document.createElement('tr');

            for (var columnIndex = rowDataExists ? -1 : 0; columnIndex < columnData.length; columnIndex++) {
                var td = document.createElement(rowIndex == -1 || columnIndex == -1 ? 'th' : 'td');
                var cellText = '';
                if (rowIndex !== -1 && columnIndex === -1) {
                    td.setAttribute('data-row-value', rowDataExists ? rowData[rowIndex].name : 'na');
                    cellText = rowData[rowIndex].name;
                } else if (columnIndex !== -1 && rowIndex === -1) {
                    td.setAttribute('data-column-value', columnData[columnIndex].name);
                    cellText = columnData[columnIndex].name;
                } else if (columnIndex !== -1 && rowIndex !== -1) {
                    td.setAttribute('data-row-value', rowDataExists ? rowData[rowIndex].name : 'na');
                    td.setAttribute('data-column-value', columnData[columnIndex].name);
                    td.setAttribute('data-row-limit', rowDataExists && rowData[rowIndex].limit ? rowData[rowIndex].limit : -1);
                    td.setAttribute('data-column-limit', columnData[columnIndex].limit ? columnData[columnIndex].limit : -1);
                }
                
                td.appendChild(document.createTextNode(cellText));
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        return table;
    }

    function createItemTemplate(fields) {
        var template = '<div class="kanban-item" data-index={data-index} style="background-color:{bgcolor};">';
        var possibleLocations = ['header', 'content', 'footer', 'hidden'];
        var fieldsByLocation = {};
        for (var i = 0; i < possibleLocations.length; i++) {
            fieldsByLocation[possibleLocations[i]] = [];
        }
        // group by location

        for (var i = 0; i < fields.length; i++) {
            fieldsByLocation[fields[i].location].push(fields[i]);
        }

        for (var i = 0; i < possibleLocations.length; i++) {
            var possibleLocation = possibleLocations[i];
            var template = template + '<div class="' + possibleLocation + '">';
            for (var j = 0; j < fieldsByLocation[possibleLocation].length; j++) {
                var field = fieldsByLocation[possibleLocation][j];
                var template = template +
                        '<div class="' + (field.cssClass ? field.cssClass : '') + '">' +
                        '<label>' + field.name + '</label>' +
                        (field.link ? '<a href="' + field.link + '" target="_blank">' : '') +
                        '<span data-key="' + field.map + '">{' + field.map + '}</span>' +
                        (field.link ? '</a>' : '') +
                        '</div>';

            }
            var template = template + '</div>';
        }

        var template = template + '</div>';
        return template;
    }

    function replaceFieldsInString(stringToCheck, fieldList, sourceItem) {
        for (var fieldIndex = 0; fieldIndex < fieldList.length; fieldIndex++) {
            var field = fieldList[fieldIndex];
            stringToCheck = stringToCheck.replace('{' + field.map + '}', sourceItem[field.map]);
        }
        return stringToCheck;
    }

    function addItemsToTable(fieldList, source, columnField, rowField, fieldTemplate,
                             table, colorField, colorValues) {
        for (var sourceIndex = 0; sourceIndex < source.length; sourceIndex++) {
            var sourceItem = source[sourceIndex];
            var itemCode  = replaceFieldsInString(fieldTemplate, fieldList, sourceItem);

            // colorField, colorValues
            var generatedDefaultColor = colorField && sourceItem[colorField] ? stringToColour(sourceItem[colorField] + 'randColor') : '';
            var paramColor = colorField && colorValues && sourceItem[colorField] && colorValues[sourceItem[colorField]] ? colorValues[sourceItem[colorField]] : '';
            itemCode = itemCode.replace('{bgcolor}', (paramColor ? paramColor : generatedDefaultColor));
            itemCode = itemCode.replace('{data-index}', sourceIndex);

            var columnSelector = '[data-column-value="' + sourceItem[columnField] + '"]';
            var rowSelector = rowField ? '[data-row-value="' + sourceItem[rowField] + '"]' : '';
            var tdToAddItem = document.querySelector('td' + columnSelector + rowSelector);

            tdToAddItem.innerHTML = tdToAddItem.innerHTML + itemCode;
        }
    }

    function getColumnHeader(targetTd) {
        return document.querySelector(containerSelector + ' th[data-column-value="' + targetTd.getAttribute('data-column-value') + '"]');
    }

    function getRowHeader(targetTd) {
        return document.querySelector(containerSelector + ' th[data-row-value="' + targetTd.getAttribute('data-row-value') + '"]');
    }
    
    function isOverLimit(targetTd, droppedItem) {
        var columnLimit = targetTd.getAttribute('data-column-limit');
        var rowLimit = targetTd.getAttribute('data-row-limit');
        var indexOfCurrentElement = droppedItem.getAttribute('data-index');
        
        var currentNumInColumn = document.querySelectorAll(containerSelector + ' td[data-column-value="' + targetTd.getAttribute('data-column-value') + '"] .kanban-item:not([data-index="'+indexOfCurrentElement+'"])').length;
        var currentNumInRow = document.querySelectorAll(containerSelector + ' td[data-row-value="' + targetTd.getAttribute('data-row-value') + '"] .kanban-item:not([data-index="'+indexOfCurrentElement+'"])').length;
        
        if (columnLimit != -1 && columnLimit < currentNumInColumn + 1) {
            alert(targetTd.getAttribute('data-column-value') + ' limit (' + columnLimit + ') < ' + (currentNumInColumn + 1));
        } else if (rowLimit != -1 && rowLimit < currentNumInRow + 1) {
            alert(targetTd.getAttribute('data-row-value') + ' limit (' + rowLimit + ') < ' + (currentNumInRow + 1));
        } else {
            return false;
        }
        return true;
        
    }

    function addHighlights(target, cssClass) {
        var columnHeader = getColumnHeader(target);
        var rowHeader = getRowHeader(target);
        if (columnHeader) {
            columnHeader.classList.add(cssClass);
        }
        if (rowHeader) {
            rowHeader.classList.add(cssClass);
        }
        target.classList.add(cssClass);
    }

    function removeHighlights(target, cssClass) {
        var columnHeader = getColumnHeader(target);
        var rowHeader = getRowHeader(target);
        if (columnHeader) {
            columnHeader.classList.remove(cssClass);
        }
        if (rowHeader) {
            rowHeader.classList.remove(cssClass);
        }
        target.classList.remove(cssClass);
    }
    
    function ajaxCall(url, droppedObj, droppedItem, successCallback) {
        var xmlhttp = new XMLHttpRequest();

        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == XMLHttpRequest.DONE ) {
                if (xmlhttp.status == 200) {
                    processAjaxResult(xmlhttp.responseText, droppedObj, droppedItem, successCallback);
                } else if (xmlhttp.status == 400) {
                    alert('There was an error 400 during ajax call');
                    return false;
                } else {
                    alert('There was an error (other than 400) during ajax call');
                    return false;
                }
            }
        };

        xmlhttp.open("GET", url, true);
        xmlhttp.send();
    }

    function getValueByName(fieldValues, keyValue) {
        var result = fieldValues.filter(function( obj ) {
            return obj.name == keyValue;
        })[0];
        return result ? result.value : '';
    }
    
    function processAjaxResult(ajaxResult, changedObject, changedItem, successCallback) {
        ajaxResult = JSON.parse(ajaxResult);
        if (ajaxResult.error) {
            alert(ajaxResult.error);
        } else if (ajaxResult.changes) {
            for (changedColumn in ajaxResult.changes) {
                successCallback();
                if (ajaxResult.changes.hasOwnProperty(changedColumn) && changedObject[changedColumn]) {
                    changedObject[changedColumn] = ajaxResult.changes[changedColumn];
                    changedItem.querySelector('span[data-key="' + changedColumn + '"]').innerHTML = ajaxResult.changes[changedColumn];
                }
            }
        }
    }

    function initDragAndDrop(kanbanTable, kanbanTableSelector, transactionCallback,
                                source, transactionUrl, fieldList,
                                columnField, columns, rowField, rows) {
            interact('.kanban-item', {
                context: kanbanTable
            }).draggable({
            // enable inertial throwing
            inertia: true,
            // keep the element within the area of it's parent
            restrict: {
                restriction: kanbanTable,
                endOnly: true
            },
            // enable autoScroll
            autoScroll: true,
            // call this function on every dragend event
            onmove: function (event) {
                var target = event.target,
                        // keep the dragged position in the data-x/data-y attributes
                        x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
                        y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                // translate the element
                target.style.webkitTransform =
                        target.style.transform =
                        'translate(' + x + 'px, ' + y + 'px)';

                // update the posiion attributes
                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);
            },
            onend: function (event) {
                var target = event.target;

                // forget movements
                target.setAttribute('data-x', 0);
                target.setAttribute('data-y', 0);
                target.style.webkitTransform =
                        target.style.transform =
                        'translate(0px, 0px)';
            }
        });
        interact(kanbanTableSelector + ' td').dropzone({
            // only accept elements matching this CSS selector
            accept: '.kanban-item',
            // Require a 75% element overlap for a drop to be possible
            overlap: 'pointer',
            ondragenter: function (event) {
                var dropzoneElement = event.target;
                addHighlights(dropzoneElement, 'hovered');
            },
            ondragleave: function (event) {
                removeHighlights(event.target, 'hovered');
            },
            ondrop: function (event) {
                var goalTd = event.target;
                var droppedItem = event.relatedTarget;
                removeHighlights(goalTd, 'hovered');
                
                var dropValid = true;
                var dropValid = !isOverLimit(goalTd, droppedItem);
                if (dropValid) {
                    if (transactionCallback) {
                        var droppedObj = source[droppedItem.getAttribute('data-index')];
                        var dropValid = transactionCallback(droppedObj, droppedItem);
                    }
                    var newColumnValue = goalTd.getAttribute('data-column-value');
                    var newRowValue = rowField ? goalTd.getAttribute('data-row-value') : 'na';
                    
                    var successCallback = function () {
                                        droppedObj[columnField] = newColumnValue;
                                        droppedItem.querySelector('span[data-key="' + columnField + '"]').innerHTML = newColumnValue;

                                        if (rowField) {
                                            droppedObj[rowField] = newRowValue;
                                            droppedItem.querySelector('span[data-key="' + rowField + '"]').innerHTML = newRowValue;
                                        }
                                        goalTd.appendChild(droppedItem);
                                    };
                    
                    if (dropValid && transactionUrl) {
                        // extract data from droppedObj (check url for {example} fields)
                        var transactionUrlReplaced = transactionUrl.replace('{' + columnField + '}', newColumnValue);
                        transactionUrlReplaced = transactionUrlReplaced.replace('{' + columnField + '-value}', getValueByName(columns, goalTd.getAttribute('data-column-value')));
                        if (rowField) {
                            transactionUrlReplaced = transactionUrlReplaced.replace('{' + rowField + '}',  newRowValue);
                            transactionUrlReplaced = transactionUrlReplaced.replace('{' + rowField + '-value}', getValueByName(rows, goalTd.getAttribute('data-row-value')));
                        }
                        transactionUrlReplaced  = replaceFieldsInString(transactionUrlReplaced, fieldList, droppedObj);
                        //console.log(transactionUrlReplaced);
                        ajaxCall(transactionUrlReplaced, droppedObj, droppedItem, successCallback);
                    } else if (dropValid) {
                        successCallback();
                    }
                }
            }
        });
    }

    function buildKanban() {
        // create table
        var table = tableCreate(parameters.config.columns, parameters.config.rows);
        table.style.display = "none";
        container.appendChild(table);

        // add items to table
        addItemsToTable(parameters.fieldList, parameters.source, parameters.config.columnField,
                        parameters.config.rowField, createItemTemplate(parameters.fieldList),
                        table, parameters.config.colorField, parameters.config.colorValues);

        // show the table
        table.style.display = "block";

        initDragAndDrop(table, containerSelector, parameters.config.transactionCallback,
                        parameters.source, parameters.config.transactionUrl, parameters.fieldList,
                        parameters.config.columnField, parameters.config.columns,
                        parameters.config.rowField, parameters.config.rows);
    }
    buildKanban();

    var api = {
        refresh: function (newConfig) {
            if (newConfig) {
                parameters.config = newConfig;
            }
            buildKanban();
        }
    }
    return api;
}
