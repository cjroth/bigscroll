const maximumPixelSize = 16777200

class VirtualScroll {
    constructor(options) {
        Object.assign(this, {
            element: document.getElementById('body'),
            data: [],
            cellHeight: 50,
            cellWidth: 50,
            debug: false,
            cell: document.createElement('div'),
            update: (cell, value) => {
                cell.innerHTML = value || ''
            }
        }, options)

        this.cell.style.width = `${this.cellWidth}px`
        this.cell.style.height = `${this.cellHeight}px`

        this.virtualRows = new Proxy([], {
            deleteProperty: (target, property) => {
                this.element.removeChild(target[property])
                return true
            },
            set: (target, property, value, receiver) => {
                target[property] = value
                if (/^\d+$/.test(property)) {
                    this.element.appendChild(value)
                }
                return true
            }
        })

        this.data = new Proxy(this.data, {
            deleteProperty: (target, property) => {
                delete target[property]
                this.fitData()
                return true
            },
            set: (target, property, value, receiver) => {
                target[property] = value
                if (/^\d+$/.test(property)) {
                    this.fitData()
                }
                return true
            }
        })

        this.maximumDisplayCountY = Math.floor(maximumPixelSize / this.cellHeight)
        this.maximumDisplayCountX = Math.floor(maximumPixelSize / this.cellWidth)
        this.currentIndexY = this.element.parentElement.scrollTop / this.cellHeight
        this.currentIndexX = this.element.parentElement.scrollLeft / this.cellWidth

        this.element.style.boxSizing = 'border-box'
        this.element.parentElement.style.overflow = 'scroll'
        this.element.style.overflow = 'hidden'

        this.updateDebugBox = VirtualScroll.createDebugBox({
            'rows': this.data.length,
            'columns': this.getColumnCount(),
            'cells': this.data.length * this.getColumnCount(),
            'cellHeight': this.cellHeight,
            'cellWidth': this.cellWidth,
            'currentIndexY': this.currentIndexY,
            'currentIndexX': this.currentIndexX
        })

        this.adjustVirtualRows()
        this.fitData()

        this.element.parentElement.addEventListener('scroll', event => {
            this.currentIndexY = Math.floor(this.element.parentElement.scrollTop / this.cellHeight)
            this.currentIndexX = Math.floor(this.element.parentElement.scrollLeft / this.cellWidth)
            this.updateVirtualRows()
            this.updateDebugBox({
                'currentIndexX': this.currentIndexX,
                'currentIndexY': this.currentIndexY
            })
        })

        window.addEventListener('resize', event => {
            this.adjustVirtualRows()
            this.updateVirtualRows()
        })

    }

    fitData() {
        if (this.data.length > this.maximumDisplayCountY) {
            console.warn(`Data is being truncated because the maximum number or rows is ${this.data.length} (data.length) / ${this.cellHeight}px (cellHeight) = ~${this.maximumDisplayCount}.`)
            this.data.length = this.maximumDisplayCountY
        }
        // @todo truncate x values too...
        this.element.style.height = Math.max(this.data.length * this.cellHeight, this.element.parentElement.clientHeight)
        this.element.style.width = Math.max(this.getColumnCount() * this.cellWidth, this.element.parentElement.clientWidth)
        this.updateVirtualRows()
    }

    adjustVirtualRows() {
        let countY = Math.min(Math.ceil(this.element.parentElement.clientHeight / this.cellHeight) + 1, this.data.length)
        let countX = Math.min(Math.ceil(this.element.parentElement.clientWidth / this.cellWidth) + 1, this.getColumnCount())
        while (this.virtualRows.length < countY) {
            let row = document.createElement('div')
            row.setAttribute('class', 'row')
            row.style.height = `${this.cellHeight}px`
            this.virtualRows.push(row)
        }
        while (this.virtualRows.length > countY) {
            let row = this.virtualRows[this.virtualRows.length - 1]
            this.virtualRows.pop()
        }
        for (let i in this.virtualRows) {
            let row = this.virtualRows[i]
            while (row.children.length < countX) {
                let cell = this.cell.cloneNode()
                cell.addEventListener('blur', event => {
                    if (String(event.target.__rawValue) !== event.target.innerHTML) {
                        let newValue
                        switch (event.target.__type) {
                            case 'string':
                                newValue = event.target.innerHTML
                                break
                            case 'number':
                                newValue = parseFloat(event.target.innerHTML)
                                break
                            case 'boolean':
                                newValue = !!event.target.innerHTML
                                break
                        }
                        this.data[event.target.__indexY][event.target.__indexX] = newValue
                    }
                })
                row.appendChild(cell)
            }
            while (row.children.length > countX) {
                let cell = row.children[row.children.length - 1]
                row.removeChild(cell)
            }
        }
        if (this.debug) {
            this.updateDebugBox({
                'countX': countX,
                'countY': countY
            })
        }
    }

    updateVirtualRows() {
        let paddingTop = this.currentIndexY * this.cellHeight
        let paddingLeft = this.currentIndexX * this.cellWidth
        this.element.style.paddingTop = `${paddingTop}px`
        this.element.style.paddingLeft = `${paddingLeft}px`
        for (let i = 0; i < this.virtualRows.length; i++) {
            let row = this.virtualRows[i]
            let indexY = this.currentIndexY + parseInt(i)
            let rowData = this.data[indexY]
            for (let j = 0; j < row.children.length; j++) {
                let cell = row.children[j]
                let indexX = this.currentIndexX + parseInt(j)
                let value = (rowData !== undefined) ? rowData[indexX] : null
                if (value !== cell.__rawValue) {
                    cell.__rawValue = value
                    cell.__indexY = indexY
                    cell.__indexX = indexX
                    cell.__type = typeof value
                    this.update(cell, value, indexY, indexX)
                }
                // cell.blur()
            }
        }
    }

    getColumnCount() {
        return this.data[0].length
    }

    getMaximumDisplayCountY() {
        return Math.floor(maximumPixelSize / this.cellHeight)
    }

    getMaximumDisplayCountX() {
        return Math.floor(maximumPixelSize / this.cellWidth)
    }

    static createDebugBox(variables) {
        let update = {}
        let dl = document.createElement('dl')
        dl.setAttribute('id', 'debug')
        document.body.appendChild(dl)
        for (let name in variables) {
            let value = variables[name]
            update[name] = addVariable(name, value)
        }
        function addVariable(name, value) {
            let dt = document.createElement('dt')
            dt.setAttribute('data-variable', name)
            dt.innerHTML = name
            dl.appendChild(dt)
            let dd = document.createElement('dd')
            dd.setAttribute('data-variable', name)
            dd.innerHTML = value
            dl.appendChild(dd)
            return function(newValue) {
                dd.innerHTML = newValue
            }
        }
        return function(variablesToUpdate) {
            for (let name in variablesToUpdate) {
                let value = variablesToUpdate[name]
                if (update[name]) {
                    update[name](value)
                } else {
                    update[name] = addVariable(name, value)
                }
            }
        }
    }
}
