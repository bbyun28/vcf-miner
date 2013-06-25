/**
 * Created with IntelliJ IDEA.
 * User: duffp
 * Date: 6/24/13
 * Time: 9:21 AM
 * To change this template use File | Settings | File Templates.
 */

// GLOBAL: contains the column names to display
var displayCols = new Array();

$( document ).ready(function()
{
    // 1ST 7 VCF columns displayed by default
    displayCols.push("CHROM");
    displayCols.push("POS");
    displayCols.push("ID");
    displayCols.push("REF");
    displayCols.push("ALT");
    displayCols.push("QUAL");
    displayCols.push("FILTER");

    addRowToConfigColumnsTable(true, "CHROM",  "The chromosome.");
    addRowToConfigColumnsTable(true, "POS",    "The reference position, with the 1st base having position 1.");
    addRowToConfigColumnsTable(true, "ID",     "Semi-colon separated list of unique identifiers.");
    addRowToConfigColumnsTable(true, "REF",    "The reference base(s). Each base must be one of A,C,G,T,N (case insensitive).");
    addRowToConfigColumnsTable(true, "ALT",    "Comma separated list of alternate non-reference alleles called on at least one of the samples");
    addRowToConfigColumnsTable(true, "QUAL",   "Phred-scaled quality score for the assertion made in ALT. i.e. -10log_10 prob(call in ALT is wrong).");
    addRowToConfigColumnsTable(true, "FILTER", "PASS if this position has passed all filters, i.e. a call is made at this position. Otherwise, if the site has not passed all filters, a semicolon-separated list of codes for filters that fail. e.g. “q10;s50” might indicate that at this site the quality is below 10 and the number of samples with data is below 50% of the total number of samples.");

    var metadataRequest = $.ajax({
        url: "/ve/meta/workspace/wf1c80c3721da2e536a53f16b4bc47aca7ef6e681", // TODO: hardcoded workspace
        dataType: "json",
        success: function(json)
        {
            var info = json.INFO;
            for (var key in info)
            {
                if (info.hasOwnProperty(key))
                {
                    displayCols.push(key);

                    addRowToInfoFilterTable(key, info[key].type);

                    addRowToConfigColumnsTable(false, key, info[key].Description);
                }
            }
        },
        error: function(jqXHR, textStatus)
        {
            alert( JSON.stringify(jqXHR) );
        }
    });

    metadataRequest.done(function(msg)
    {
        // setup the variant table
        initVariantTable(displayCols);

        var pleaseWaitDiv = $('<div class="modal hide" id="pleaseWaitDialog" data-backdrop="static" data-keyboard="false"><div class="modal-header"><h3>Running Query.  Please wait...</h3></div><div class="modal-body"></div></div>');
        pleaseWaitDiv.modal();

        // populate the variant table
        $.ajax({
            url: "/ve/q/wf1c80c3721da2e536a53f16b4bc47aca7ef6e681/page/99", // TODO: hardcoded query
            dataType: "json",
            success: function(json)
            {
                addRowsToVariantTable(json.results, displayCols);
            },
            error: function(jqXHR, textStatus)
            {
                alert( JSON.stringify(jqXHR) );
            },
            complete: function(jqXHR, textStatus)
            {
                pleaseWaitDiv.modal('hide');
            }
        });

        var query = new Object();
        query.numberResults = 100;
        query.minAltReads   = 0.1;
        query.minNumSample  = 0.2;
        query.maxNumSample  = 0.3;
        query.minAC         = 0.4;
        query.maxAC         = 0.5;
        query.minPHRED      = 0.6;

        console.debug("Sending query to server:" + JSON.stringify(query));

        var req = $.ajax({
            type: "POST",
            url: "/ve/eq",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(query),
            dataType: "json",
            success: function(json)
            {
                // TODO: implement this
                //addRowsToVariantTable(json.results, displayCols);
            },
            error: function(jqXHR, textStatus)
            {
                alert( JSON.stringify(jqXHR) );
            }
        });
    });
});

/**
 * Adds a row to the INFO Filter table.
 *
 * @param name The name of the INFO field.
 * @param type The type of the INFO field.
 */
function addRowToInfoFilterTable(name, type)
{
    var infoFilterTable = document.getElementById('info_filter_table');

    //insert a new row at the bottom
    var newRow = infoFilterTable.insertRow(infoFilterTable.rows.length);

    //create new cells
    var newCell1 = newRow.insertCell(0);
    var newCell2 = newRow.insertCell(1);
    var newCell3 = newRow.insertCell(2);

    //set the cell text
    newCell1.innerHTML = "<button title='Add to your search' type=\"button\" class=\"btn-mini\"><i class=\"icon-plus\"></i></button>";
    newCell2.innerHTML = name;

    if (type === 'Flag')
    {
        newCell3.innerHTML = "<input class=\"input-mini\" type=\"checkbox\" checked=\"true\" name=\"min_alt_reads\"/>";
    }
    else if ((type === 'Integer') || (type === 'Float'))
    {
        var defaultTextValue;
        if (type === 'Integer')
            defaultTextValue = '0';
        else
            defaultTextValue = '0.0';

        newCell3.innerHTML =
            "<table><tr>"
                + "<td><select style='width:50px;' tabindex='1'>"
                + "<option value='eq'>=</option>"
                + "<option value='gt'>&gt;</option>"
                + "<option value='gteq'>&gt;=</option>"
                + "<option value='lt'>&lt;</option>"
                + "<option value='lteq'>&lt;=</option>"
                + "</select></td>"
                + "<td><input class=\"input-mini\" type=\"text\" value='"+defaultTextValue+"' name=\"min_alt_reads\"/></td>"
                +"</tr></table>";
    }
    else
    {
        newCell3.innerHTML = "<input class=\"input-mini\" type=\"text\" name=\"min_alt_reads\"/>";
    }
}

/**
 * Initializes the DataTable widget for variants.
 *
 * @param displayCols An array of strings, each representing the column title.
 */
function initVariantTable(displayCols)
{
    var aoColumns = new Array();
    for (var i = 0; i < displayCols.length; i++)
    {
        var isVisible = false;

        // only 1st 7 columns visible by default
        if (i <= 6)
        {
            isVisible = true;
        }

        aoColumns.push(
            {
                "sTitle":   displayCols[i],
                "bVisible": isVisible
            }
        );
    }
    $('#variant_table').dataTable( {
        "aoColumns": aoColumns
    });
}

/**
 * Adds 0 or more rows to the Variant Table.
 *
 * @param variants An array of variant objects.  Each is rendered as a single DataTable row.
 * @param displayCols An array of strings, each representing the column title.
 */
function addRowsToVariantTable(variants, displayCols)
{
    var aaData = new Array();

    for (var i = 0; i < variants.length; i++)
    {
        var variant = variants[i];

        var aaDataRow = new Array();
        aaDataRow.push(variant['CHROM']);
        aaDataRow.push(variant['POS']);
        aaDataRow.push(variant['ID']);
        aaDataRow.push(variant['REF']);
        aaDataRow.push(variant['ALT']);
        aaDataRow.push(variant['QUAL']);
        aaDataRow.push(variant['FILTER']);
        var variantInfo = variant['INFO'];
        for (var disIdx=7; disIdx < displayCols.length; disIdx++)
        {
            var infoFieldName = displayCols[disIdx];

            if(variantInfo[infoFieldName] !== undefined)
            {
                aaDataRow.push(variantInfo[infoFieldName]);
            }
            else
            {
                aaDataRow.push("");
            }
        }

        aaData.push(aaDataRow);
    }

    // update DataTable
    $('#variant_table').dataTable().fnAddData(aaData);
}

/**
 * Shows or hides Variant Table columns based on the Config Columns table checkboxes.
 */
function toggleDisplayColumns()
{
    var oTable = $('#variant_table').dataTable();

    for (i=0; i < displayCols.length; i++)
    {
        // lookup checkbox widget (toggle_[displayCol])
        var checkbox = $('#toggle_'+displayCols[i]);
        if (checkbox.is(':checked'))
        {
            oTable.fnSetColumnVis( i, true);
        }
        else
        {
            oTable.fnSetColumnVis( i, false);
        }
    }

    // resize columns
    oTable.width("100%");

    // close dialog
    $("#column_dialog_close").click();
}

/**
 * Add a row to the Config Columns Table.
 *
 * @param table
 * @param checked
 * @param key
 * @param description
 */
function addRowToConfigColumnsTable(checked, key, description)
{
    var table = document.getElementById('config_columns_table');

    //insert a new row at the bottom
    var newCTableRow = table.insertRow(table.rows.length);

    //create new cells
    var newCTableCell1 = newCTableRow.insertCell(0);
    var newCTableCell2 = newCTableRow.insertCell(1);
    var newCTableCell3 = newCTableRow.insertCell(2);

    //set the cell text
    if (checked)
        newCTableCell1.innerHTML = "<input class=\"input-mini\" type=\"checkbox\" checked=\"true\" id=\"toggle_"+key+"\"/>";
    else
        newCTableCell1.innerHTML = "<input class=\"input-mini\" type=\"checkbox\" id=\"toggle_"+key+"\"/>";

    newCTableCell2.innerHTML = key;
    newCTableCell3.innerHTML = description;
}