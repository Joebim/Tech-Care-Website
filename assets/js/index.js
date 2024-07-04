
// ------- Data Fetching -------

const username = 'coalition';
const password = 'skills-test';
const authString = btoa(`${username}:${password}`);

const headers = {
    Authorization: `Basic ${authString}`,
};

const fetchData = async () => {
    try {
        const response = await fetch('https://fedskillstest.coalitiontechnologies.workers.dev', {
            headers: headers,
        });
        if (!response.ok) {
            throw new Error(`Error Fetching Data: ${response.status}`)
        }
        const data = await response.json();
        console.log('data', data)
        return data;
    } catch (error) {
        console.error('Error: ', error)
    }
}


// ----- Navigation ------

const navlinks = document.querySelectorAll('.nav-links li')
const pages = document.querySelectorAll('.container .page')

pages.forEach(div => div.style.display = 'none');
navlinks.forEach(link => link.style.backgroundColor = 'transparent');

pages[1].style.display = 'flex';
navlinks[1].style.backgroundColor = 'var(--active1)'

navlinks.forEach((link, index) => {
    link.addEventListener('click', () => {
        navlinks.forEach(link => link.style.backgroundColor = 'transparent')
        pages.forEach(div => div.style.display = 'none');

        link.style.backgroundColor = 'var(--active1)'
        pages[index].style.display = 'flex';
    })
})

function removeChartContainer() {
    const chartContainer = document.querySelector("#chart");
    if (chartContainer) {
        chartContainer.parentNode.removeChild(chartContainer);
    }
}


// ----- Data rendering  -------

const getSelectedPatientData = (data, patientName) => {
    return data.find(patient => patient.name === patientName);
};

const chartRender = (patient, updateSelectedData) => {

    const chartDataX = patient.diagnosis_history.map(item => {
        const month = item.month.slice(0, 3);
        const monthYearString = `${month}, ${item.year}`;
        return monthYearString;
    });
    const neededChartData = chartDataX.slice(0, 6)
    const labels = [60, 80, 100, 120, 140, 160, 180]

    console.log('chartdataX', neededChartData)

    const diagnisticsData = patient.diagnosis_history.map(item => {
        return item;
    })

    const systolicData = diagnisticsData.map(data => data?.blood_pressure?.systolic?.value).splice(-6)
    const diastolicData = diagnisticsData.map(data => data?.blood_pressure?.diastolic?.value).splice(-6)

    var options = {
        chart: {
            type: 'line',
            height: '200px',
            width: '100%',
            toolbar: {
                show: false
            },
            events: {
                dataPointSelection: function (event, chartContext, config) {
                    const index = config.dataPointIndex;
                    updateSelectedData(index);
                }
            },
            zoom: {
                enabled: true
            }
        },
        tooltip: {
            intersect: true,
            shared: false,
        },
        series: [{
            name: 'Systolic',
            data: systolicData,
            color: "#E66FD2"
        },
        {
            name: 'Diastolic',
            data: diastolicData,
            color: "#8C6FE6"
        }],
        xaxis: {
            categories: neededChartData,
            labels: {
                style: {
                    fontSize: '8px',
                }
            }
        },
        yaxis: {
            min: Math.min(...labels),
            max: Math.max(...labels),
            tickAmount: labels.length - 1,
            labels: {
                formatter: function (value) {
                    let closest = labels.reduce((prev, curr) => {
                        return (Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev);
                    });
                    return closest;
                }
            }
        },
        stroke: {
            curve: 'smooth',
            width: 2,
        },
        markers: {
            size: 5,
        },
        legend: {
            show: false,
        }
    }

    removeChartContainer()
    // var chart = new ApexCharts(document.querySelector("#chart"), options);
    const chartContain = document.getElementById('chart-wrap')
    const newChartContainer = document.createElement("div");
    newChartContainer.id = "chart";
    chartContain.appendChild(newChartContainer);

    const newChart = new ApexCharts(newChartContainer, options);
    newChart.render();
}

const updatePageWithPatientData = (patient) => {


    const diagnisticsData = patient.diagnosis_history.map(item => {
        return item;
    })


    const updateSelectedData = (index) => {
        document.getElementById('systolic-num').textContent = diagnisticsData[index]?.blood_pressure?.systolic?.value;
        document.getElementById('diastolic-num').textContent = diagnisticsData[index]?.blood_pressure?.diastolic?.value;
        document.getElementById('average-text-systolic').textContent = diagnisticsData[index]?.blood_pressure?.systolic?.levels;
        document.getElementById('average-text-diastolic').textContent = diagnisticsData[index]?.blood_pressure?.diastolic?.levels;
        document.getElementById('resp-value').textContent = diagnisticsData[index]?.respiratory_rate?.value
        document.getElementById('resp-average').textContent = diagnisticsData[index]?.respiratory_rate?.levels
        document.getElementById('temp-value').textContent = diagnisticsData[index]?.temperature?.value
        document.getElementById('temp-average').textContent = diagnisticsData[index]?.temperature?.levels
        document.getElementById('heart-value').textContent = diagnisticsData[index]?.heart_rate?.value
        document.getElementById('heart-average').textContent = diagnisticsData[index]?.heart_rate?.levels

    };


    if (diagnisticsData.length > 0) {
        updateSelectedData(0);
    }



    const diagnosticsList = document.getElementById('diagnosic-list')

    patient.diagnostic_list.forEach((item, index) => {
        const tableRow = document.createElement('tr')
        const column1 = document.createElement('td')
        column1.textContent = item.name
        const column2 = document.createElement('td')
        column2.textContent = item.description
        const column3 = document.createElement('td')
        column3.textContent = item.status

        tableRow.appendChild(column1)
        tableRow.appendChild(column2)
        tableRow.appendChild(column3)

        diagnosticsList.appendChild(tableRow)
    })

    document.getElementById('user-img').src = patient.profile_picture
    document.getElementById('name').textContent = patient.name
    document.getElementById('dob').textContent = patient.date_of_birth
    document.getElementById('gender').textContent = patient.gender
    document.getElementById('contact-info').textContent = patient.phone_number
    document.getElementById('emergency-contacts').textContent = patient.emergency_contact
    document.getElementById('insurance-provider').textContent = patient.insurance_type

    const labResult = document.getElementById('results')
    labResult.innerHTML = ''

    patient.lab_results.forEach((item, index) => {
        const result = document.createElement('div')
        result.classList.add('result')

        const resultName = document.createElement('p')
        resultName.textContent = item
        const downloadImg = document.createElement('img')
        downloadImg.src = '../assets/images/download_FILL0_wght300_GRAD0_opsz24 (1).svg'

        result.appendChild(resultName)
        result.appendChild(downloadImg)
        labResult.appendChild(result)
    })

    chartRender(patient, updateSelectedData)
};

document.addEventListener('DOMContentLoaded', async () => {
    const patientName = 'Jessica Taylor';
    const data = await fetchData();

    if (data) {
        const selectedPatient = getSelectedPatientData(data, patientName);

        if (selectedPatient) {
            console.log('Selected Patient:', selectedPatient);
            updatePageWithPatientData(selectedPatient);
        } else {
            console.error('Patient not found');
        }
    } else {
        console.error('No data fetched');
    }
});



const displayData = async () => {

    const patientList = document.getElementById('patient-list');

    patientList.innerHTML = '';

    const data = await fetchData()

    data.forEach((item, index) => {
        const patientItem = document.createElement('li');
        patientItem.classList.add('list-item')

        const listWrap = document.createElement('div')
        listWrap.classList.add('li-wrap')
        // Create list items
        const listImg = document.createElement('img');
        listImg.classList.add('li-img')
        listImg.src = item.profile_picture;

        const listName = document.createElement('div');

        listName.classList.add('li-name')
        // list name component
        const listText1 = document.createElement('p');
        listText1.textContent = item.name;

        const listText2 = document.createElement('p');
        listText2.textContent = `${item.gender}, ${item.age}`;

        patientItem.appendChild(listWrap);
        listWrap.appendChild(listImg);
        listWrap.appendChild(listName);

        listName.appendChild(listText1);
        listName.appendChild(listText2);


        patientItem.addEventListener('click', () => {
            handlePatientClick(item.name, data);


        });
        patientList.appendChild(patientItem);

    });

    const patientlists = document.querySelectorAll('.list-item')
    patientlists[3].style.backgroundColor = 'var(--active2)';

    patientlists.forEach((list, index) => {
        list.addEventListener('click', () => {
            patientlists.forEach(list => list.style.backgroundColor = 'transparent')
            list.style.backgroundColor = 'var(--active2)'
        })
    })

}


const handlePatientClick = async (patientName, data) => {

    const patient = data.find(patient => patient.name === patientName); // Find selected patient
    updatePageWithPatientData(patient)

}

displayData()