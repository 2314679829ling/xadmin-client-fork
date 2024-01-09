import dayjs from "dayjs";
import { message } from "@/utils/message";
import type { PaginationProps } from "@pureadmin/table";
import { onMounted, reactive, ref, type Ref, toRaw } from "vue";
import {
  deleteOperationLogApi,
  getOperationLogListApi,
  manyDeleteOperationLogApi
} from "@/api/system/logs/operation";
import { useRouter } from "vue-router";
import { delay, getKeyList } from "@pureadmin/utils";
import { useI18n } from "vue-i18n";
import { hasAuth, hasGlobalAuth } from "@/router/utils";

export function useOperationLog(tableRef: Ref) {
  const { t } = useI18n();
  const sortOptions = [
    {
      label: `${t("sorts.createdDate")} ${t("labels.descending")}`,
      key: "-created_time"
    },
    {
      label: `${t("sorts.createdDate")} ${t("labels.ascending")}`,
      key: "created_time"
    }
  ];
  const form = reactive({
    ipaddress: "",
    system: "",
    browser: "",
    path: "",
    creator_id: "",
    ordering: sortOptions[0].key,
    page: 1,
    size: 10
  });
  const router = useRouter();
  const manySelectCount = ref(0);
  const dataList = ref([]);
  const loading = ref(true);
  const showColumns = ref([]);
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    pageSizes: [5, 10, 20, 50, 100],
    background: true
  });
  const columns: TableColumnList = [
    {
      type: "selection",
      align: "left"
    },
    {
      label: t("labels.id"),
      prop: "pk",
      minWidth: 100
    },
    {
      label: t("logsOperation.module"),
      prop: "module",
      minWidth: 120,
      hide: () => showColumns.value.indexOf("module") === -1
    },
    {
      label: t("user.user"),
      prop: "creator",
      minWidth: 100,
      cellRenderer: ({ row }) => (
        <el-link onClick={() => onGoDetail(row as any)}>
          {row.creator?.username ? row.creator?.username : "/"}
        </el-link>
      ),
      hide: () => showColumns.value.indexOf("creator") === -1
    },
    {
      label: t("logsOperation.address"),
      prop: "ipaddress",
      minWidth: 150,
      hide: () => showColumns.value.indexOf("ipaddress") === -1
    },
    {
      label: t("logsOperation.requestPath"),
      prop: "path",
      minWidth: 150,
      cellRenderer: ({ row }) => (
        <span>
          {row.method}: {row.path}
        </span>
      ),
      hide: () => showColumns.value.indexOf("path") === -1
    },
    {
      label: t("logsOperation.parameters"),
      prop: "body",
      minWidth: 150,
      hide: () => showColumns.value.indexOf("body") === -1
    },
    {
      label: t("logsOperation.browser"),
      prop: "browser",
      minWidth: 150,
      hide: () => showColumns.value.indexOf("browser") === -1
    },
    {
      label: t("logsOperation.system"),
      prop: "system",
      minWidth: 150,
      hide: () => showColumns.value.indexOf("system") === -1
    },
    {
      label: t("logsOperation.statusCode"),
      prop: "response_code",
      minWidth: 100,
      hide: () => showColumns.value.indexOf("response_code") === -1
    },
    {
      label: t("logsOperation.response"),
      prop: "response_result",
      minWidth: 150,
      hide: () => showColumns.value.indexOf("response_result") === -1
    },
    {
      label: t("sorts.createdDate"),
      minWidth: 180,
      prop: "created_time",
      formatter: ({ created_time }) =>
        dayjs(created_time).format("YYYY-MM-DD HH:mm:ss"),
      hide: () => showColumns.value.indexOf("created_time") === -1
    },
    {
      label: t("labels.operations"),
      fixed: "right",
      width: 100,
      slot: "operation",
      hide: !hasAuth("delete:systemOperationLog")
    }
  ];

  function onGoDetail(row: any) {
    if (hasGlobalAuth("list:systemUser") && row.creator && row.creator?.pk) {
      router.push({
        name: "systemUser",
        query: { pk: row.creator.pk }
      });
    }
  }

  async function handleDelete(row) {
    deleteOperationLogApi(row.pk).then(async res => {
      if (res.code === 1000) {
        message(t("results.success"), { type: "success" });
        await onSearch();
      } else {
        message(`${t("results.failed")}，${res.detail}`, { type: "error" });
      }
    });
  }

  async function handleSizeChange(val: number) {
    form.page = 1;
    form.size = val;
    await onSearch();
  }

  async function handleCurrentChange(val: number) {
    form.page = val;
    await onSearch();
  }

  function handleSelectionChange(val) {
    manySelectCount.value = val.length;
  }

  function onSelectionCancel() {
    manySelectCount.value = 0;
    // 用于多选表格，清空用户的选择
    tableRef.value.getTableRef().clearSelection();
  }

  function handleManyDelete() {
    if (manySelectCount.value === 0) {
      message(t("results.noSelectedData"), { type: "error" });
      return;
    }
    const manySelectData = tableRef.value.getTableRef().getSelectionRows();
    manyDeleteOperationLogApi({
      pks: JSON.stringify(getKeyList(manySelectData, "pk"))
    }).then(async res => {
      if (res.code === 1000) {
        message(t("results.batchDelete", { count: manySelectCount.value }), {
          type: "success"
        });
        await onSearch();
      } else {
        message(`${t("results.failed")}，${res.detail}`, { type: "error" });
      }
    });
  }

  async function onSearch(init = false) {
    if (init) {
      pagination.currentPage = form.page = 1;
      pagination.pageSize = form.size = 10;
    }
    loading.value = true;
    const { data } = await getOperationLogListApi(toRaw(form));
    if (data.results.length > 0) {
      showColumns.value = Object.keys(data.results[0]);
    }
    dataList.value = data.results;
    pagination.total = data.total;
    delay(500).then(() => {
      loading.value = false;
    });
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    onSearch();
  };

  onMounted(() => {
    onSearch();
  });

  return {
    t,
    form,
    loading,
    columns,
    dataList,
    pagination,
    sortOptions,
    manySelectCount,
    onSelectionCancel,
    onSearch,
    resetForm,
    handleDelete,
    handleManyDelete,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}